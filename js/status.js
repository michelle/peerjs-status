/** @jsx React.DOM */
var TestChart = React.createClass({displayName: 'TestChart',
  hashMatch: /^#(chrome\d+|firefox\d+)(chrome\d+|firefox\d+)$/,
  getInitialState: function() {
    return {
      results: [],
      clientBrowsers: [],
      hostBrowsers: []
    };
  },
  componentWillMount: function() {
    this.loadTestResults();
  },
  loadTestResults: function() {
    var component = this;
    $.ajax({
      url: this.props.url,
      dataType: 'json'
    }).success(function(data) {
      component.setStateFromServerData(data);
    }).error(function(xhr, status, err) {
      console.error(component.props.url, status, err.toString());
    });
  },

  setStateFromServerData: function(data) {
    // Results, keyed on host.
    var resultsByHost = {};
    var hostBrowsers = {};
    var clientBrowsers = {};

    // Determine if test is linked to.
    var selection = window.location.hash;
    var selectedClient, selectedHost, selectedResult, clicked;
    if (selection && this.hashMatch.test(selection)) {
      var match = this.hashMatch.exec(selection);
      selectedClient = fullBrowserNameFromSpecific(match[1]);
      selectedHost = fullBrowserNameFromSpecific(match[2]);
      clicked = true;
    }

    data.map(function(result) {
      var hostName = browserName(result.host.browser);
      hostBrowsers[hostName] = 1;
      result.hostBrowser = hostName;

      var clientName = browserName(result.client.browser);
      clientBrowsers[clientName] = 1;
      result.clientBrowser = clientName;

      resultsByHost[hostName] = resultsByHost[hostName] || {};
      resultsByHost[hostName][clientName] = result;
    });

    function browserSort(a, b) {
      // For same browser, sort in reverse.
      if (a.indexOf('Chrome') === b.indexOf('Chrome')) {
        return b > a ? 1 : -1;
      } else {
        return b.indexOf('Chrome') === 0 ? 1 : -1;
      }
    };

    hostBrowsers = Object.keys(hostBrowsers).sort(browserSort);
    clientBrowsers = Object.keys(clientBrowsers).sort(browserSort);

    // First level: host, second nested level: client.
    var results = [];
    hostBrowsers.map(function(hostBrowser, i) {
      results[i] = [];
      clientBrowsers.map(function(clientBrowser, j) {
        var result = resultsByHost[hostBrowser][clientBrowser] || {hostBrowser: hostBrowser, clientBrowser: clientBrowser};
        results[i][j] = result;
        if (hostBrowser === selectedHost && clientBrowser === selectedClient) {
          selectedResult = result;
        }
      });
    });
    var version = data[0] ? data[0].version : '...';


    this.setState({
      version: version,
      results: results,
      hostBrowsers: hostBrowsers,
      clientBrowsers: clientBrowsers,
      selectedClient: selectedClient,
      selectedHost: selectedHost,
      selectedResult: selectedResult,
      clicked: clicked
    });
  },

  selectClient: function(i) {
    if (!this.state.clicked) {
      this.setState({selectedClient: this.state.clientBrowsers[i], selectedHost: null});
    }
  },
  selectHost: function(i) {
    if (!this.state.clicked) {
      this.setState({selectedHost: this.state.hostBrowsers[i], selectedClient: null});
    }
  },
  selectHostAndClientAndResult: function(i, j, force) {
    if (!this.state.clicked || force) {
      var selectedResult = this.state.results[i][j];
      this.setState({
        selectedClient: selectedResult.clientBrowser,
        selectedHost: selectedResult.hostBrowser,
        selectedResult: selectedResult
      });
    }
  },
  clickHostAndClientAndResult: function(i, j) {
    var clickedResult = this.state.results[i][j];
    if (this.state.selectedClient === clickedResult.clientBrowser && this.state.selectedHost === clickedResult.hostBrowser && this.state.clicked) {
      // "unclick"
      this.setState({clicked: false});
    } else if (!clickedResult.result) {
      // "unclick"
      this.setState({clicked: false});
      this.selectHostAndClientAndResult(i, j, true);
    } else {
      this.selectHostAndClientAndResult(i, j, true);
      this.setState({clicked: true});
      window.location.hash = specificBrowserClassName(clickedResult.clientBrowser) + specificBrowserClassName(clickedResult.hostBrowser);
    }
  },

  isSelected: function(host, client) {
    return this.state.selectedClient === client || this.state.selectedHost === host;
  },
  isClicked: function(host, client) {
    return this.state.clicked && this.state.selectedClient === client && this.state.selectedHost === host;
  },

  render: function() {
    var results = this.state.results.map(function(hostResults, i) {
      var host = hostResults[0].hostBrowser;
      hostResults = hostResults.map(function(result, j) {
        if (host !== result.hostBrowser) {
          console.error('Hosts don\'t match in the same column!!', host, result.hostBrowser);
        }
        return (
          ResultCell(
            {data:result,
            selected:this.isSelected(host, result.clientBrowser),
            clicked:this.isClicked(host, result.clientBrowser),
            onClick:this.clickHostAndClientAndResult.bind(this, i, j),
            onMouseEnter:this.selectHostAndClientAndResult.bind(this, i, j, false)} )
        );
      }, this);

      var hostClasses = 'browser ' + browserClassName(host) +
        (this.state.selectedHost === host ? ' selected' : '');
      hostResults.unshift(
        Browser(
          {browser:host,
          selected:this.state.selectedHost === host,
          onMouseEnter:this.selectHost.bind(this, i)}
        )
      );

      var resultsClasses = 'results ' + browserClassName(host);
      return (
        React.DOM.tr( {className:resultsClasses}, 
          hostResults
        )
      );
    }, this);

    var clientBrowsers = this.state.clientBrowsers.map(function(browser, i) {
      return (
        Browser(
          {browser:browser,
          selected:this.state.selectedClient === browser,
          onMouseEnter:this.selectClient.bind(this, i)}
        )
      );
    }, this);

    return (
      React.DOM.div( {className:"tests"}, 
        React.DOM.div( {className:"chart"}, 
          React.DOM.table(null, 
            React.DOM.tr( {className:"client browsers"}, 
              React.DOM.th(null),
              clientBrowsers
            ),
            results
          ),
          React.DOM.div( {className:"footer"}, 
            React.DOM.span( {className:"github"}, 
              React.DOM.a( {href:""}, "Fork"), " ", React.DOM.a( {href:""}, "me"), " ", React.DOM.a( {href:""}, "on"), " ", React.DOM.a( {href:""}, "Github"),"."
            ),
            React.DOM.span( {className:"version"}, 
              "Latest tested version: ", React.DOM.strong(null, this.state.version),". (Suggestions? ", React.DOM.a( {href:"mailto:team@peerjs.com"}, "Email us"),"!)"
            )
          )
        ),
        TestDetails(
          {data:this.state.selectedResult,
          client:this.state.selectedClient,
          host:this.state.selectedHost} )
      )
    );
  }
});


var TestDetails = React.createClass({displayName: 'TestDetails',
  renderInner: function() {
    var result = this.props.data;
    var hasDataValue = 'untested';
    if (result && result.result) {
      if (result.result.data) {
        hasDataValue = 'available';
      } else {
        hasDataValue = 'unavailable';
      }
    }

    var hasDataClass = 'status ' + hasDataValue;
    hasData = (
      React.DOM.span( {className:hasDataClass}, hasDataValue)
    );
    var host = (
      React.DOM.div( {className:'host ' + browserClassName(this.props.host)}, 
        React.DOM.span( {className:"name"}, this.props.host), " ", React.DOM.span( {className:"label"}, "host")
      )
    );
    var client = (
      React.DOM.div( {className:'client ' + browserClassName(this.props.client)}, 
        React.DOM.span( {className:"name"}, this.props.client), " ", React.DOM.span( {className:"label"}, "client")
      )
    );

    var inner = [];
    inner.push(
      React.DOM.div( {className:'summary ' + hasDataValue}, "P2P data is ", hasData, " between ", host, " and ", client,".")
    );
    if (hasDataValue !== 'untested') {
      inner.push(this.renderAdvanced());
    }
    return inner;
  },
  renderDefault: function() {
    return (
      React.DOM.div( {className:"summary"}, "No test selected.")
    );
  },
  renderAdvanced: function() {
    var result = this.props.data;
    // TODO: show last passing run / historical version runs in the History
    // component.
    return (
      React.DOM.div( {className:"advanced"}, 
        Logs( {clientLogs:result.client.log, hostLogs:result.host.log} ),
        React.DOM.div( {className:"history"}
        )
      )
    );
  },
  render: function() {
    var inner;
    if (this.props.client && this.props.host) {
      inner = this.renderInner();
    } else {
      inner = this.renderDefault();
    }
    return (
      React.DOM.div( {className:"details"}, 
        React.DOM.h1(null, "PeerJS ", React.DOM.em(null, "Status")),
        inner
      )
    );
  }
});

var Logs = React.createClass({displayName: 'Logs',
  formatLogLine: function(type, log) {
    log = log.split(' ');
    var timestamp = log.shift();
    log = log.join(' ');
    return (
      React.DOM.div( {className:'log ' + type}, 
        React.DOM.span( {className:"timestamp"}, timestamp),log
      )
    );
  },
  render: function() {
    var clientLogs = this.props.clientLogs;
    var hostLogs = this.props.hostLogs;
    var mixedLogs;

    if (!hostLogs) {
      mixedLogs = clientLogs.map(this.formatLogLine.bind(this, 'client'));
    } else if (!clientLogs) {
      mixedLogs = hostLogs.map(this.formatLogLine.bind(this, 'host'));
    } else {
      clientLogs = clientLogs.map(function(log) {
        return {log: log, time: parseInt(log.split(' ')[0]), type: 'client'};
      });
      hostLogs = hostLogs.map(function(log) {
        return {log: log, time: parseInt(log.split(' ')[0]), type: 'host'};
      });
      mixedLogs = clientLogs.concat(hostLogs);
      mixedLogs.sort(function(a, b) {
        if (a.time < b.time) {
          return -1;
        } else {
          return 1;
        }
      });
      mixedLogs = mixedLogs.map(function(data) {
        return this.formatLogLine(data.type, data.log);
      }, this);
    }

    return (
      React.DOM.div( {className:"logs"}, 
        React.DOM.h3(null, "Logs"),
        mixedLogs
      )
    );
  }
});


var ResultCell = React.createClass({displayName: 'ResultCell',
  getInitialState: function() {
    var result = this.props.data;
    if (result.result) {
      if (result.result.data) {
        return {pass: true};
      }
      return {pass: false};
    }
    return {};
  },
  render: function() {
    var classes = (this.props.selected ? 'selected ' : '') +
      'result ' + browserClassName(this.props.data.clientBrowser) +
      (this.props.clicked ? ' clicked' : '');

    if (typeof this.state.pass !== 'undefined') {
      classes += ' has';
      if (this.state.pass) {
        classes += ' green';
      } else {
        classes += ' red';
      }
    } else {
      classes += ' empty';
    }
    return (
      React.DOM.td(
        {className:classes,
        onClick:this.props.onClick,
        onMouseEnter:this.props.onMouseEnter} )
    );
  }
});

var Browser = React.createClass({displayName: 'Browser',
  render: function() {
    var browser = this.props.browser;
    var classes = 'browser ' + browserClassName(browser) +
      (this.props.selected ? ' selected' : '');
    return (
      React.DOM.th( {className:classes, onMouseEnter:this.props.onMouseEnter}, 
        browser.replace(/[\D]/g, '')
      )
    );
  }
});


React.renderComponent(
  // TODO: <TestChart url='/ajax/status' />,
  TestChart( {url:"dummy.json"} ),
  document.getElementById('content')
);


// Helpers
function browserName(browserHash) {
  return browserHash.name + ' (' + browserHash.majorVersion + ')';
}

function browserClassName(browserString) {
  return browserString.replace(/[\s\(\)\d]/g, '').toLowerCase();
}

function specificBrowserClassName(browserString) {
  return browserString.replace(/[\s\(\)]/g, '').toLowerCase();
}

function fullBrowserNameFromSpecific(specificString) {
  var numberString = /\d+/.exec(specificString)[0];
  specificString = specificString.split('');
  for (var i = 0, ii = numberString.length; i < ii; i += 1) {
    specificString.pop();
  }
  var first = specificString.shift().toUpperCase();
  return first + specificString.join('') + ' (' + numberString + ')';
}
