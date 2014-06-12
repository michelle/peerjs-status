/** @jsx React.DOM */
var TestChart = React.createClass({
  getInitialState: function() {
    return {
      results: [],
      clientBrowsers: [],
      hostBrowsers: [],
      selectedClient: null,
      selectedHost: null
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
        results[i][j] = resultsByHost[hostBrowser][clientBrowser] || {hostBrowser: hostBrowser, clientBrowser: clientBrowser};
      });
    });
    this.setState({results: results, hostBrowsers: hostBrowsers, clientBrowsers: clientBrowsers});
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
          <ResultCell
            data={result}
            selected={this.isSelected(host, result.clientBrowser)}
            clicked={this.isClicked(host, result.clientBrowser)}
            onClick={this.clickHostAndClientAndResult.bind(this, i, j)}
            onMouseEnter={this.selectHostAndClientAndResult.bind(this, i, j, false)} />
        );
      }, this);

      var hostClasses = 'browser ' + browserClassName(host) +
        (this.state.selectedHost === host ? ' selected' : '');
      hostResults.unshift(
        <Browser
          browser={host}
          selected={this.state.selectedHost === host}
          onMouseEnter={this.selectHost.bind(this, i)}
        />
      );

      var resultsClasses = 'results ' + browserClassName(host);
      return (
        <tr className={resultsClasses}>
          {hostResults}
        </tr>
      );
    }, this);

    var clientBrowsers = this.state.clientBrowsers.map(function(browser, i) {
      return (
        <Browser
          browser={browser}
          selected={this.state.selectedClient === browser}
          onMouseEnter={this.selectClient.bind(this, i)}
        />
      );
    }, this);

    return (
      <div className="tests">
        <div className="chart">
          <table>
            <tr className="client browsers">
              <th></th>
              {clientBrowsers}
            </tr>
            {results}
          </table>
        </div>
        <TestDetails
          data={this.state.selectedResult}
          client={this.state.selectedClient}
          host={this.state.selectedHost} />
      </div>
    );
  }
});


var TestDetails = React.createClass({
  renderInner: function() {
    var result = this.props.data;
    var hasData = 'untested';
    if (result && result.result) {
      if (result.result.data) {
        hasData = 'available';
      } else {
        hasData = 'unavailable';
      }
    }

    var hasDataClass = 'status ' + hasData;
    hasData = (
      <span className={hasDataClass}>{hasData}</span>
    );
    var host = (
      <div className="host">
        <span className={browserClassName(this.props.host)}>{this.props.host}</span> <span className="label">(host)</span>
      </div>
    );
    var client = (
      <div className="client">
        <span className={browserClassName(this.props.client)}>{this.props.client}</span> <span className="label">(client)</span>
      </div>
    );

    return (
      <h2 className="summary">P2P data is {hasData} between {host} and {client}</h2>
    );
  },
  render: function() {
    var inner = this.props.client && this.props.host ? this.renderInner() : undefined;
    return (
      <div className="details">
        {inner}
      </div>
    );
  }
});


var ResultCell = React.createClass({
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

    // TODO: create better results! Or more deets on hover.
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
      <td
        className={classes}
        onClick={this.props.onClick}
        onMouseEnter={this.props.onMouseEnter} />
    );
  }
});

var Browser = React.createClass({
  render: function() {
    var browser = this.props.browser;
    var classes = 'browser ' + browserClassName(browser) +
      (this.props.selected ? ' selected' : '');
    return (
      <th className={classes} onMouseEnter={this.props.onMouseEnter}>
        {browser.replace(/[\D]/g, '')}
      </th>
    );
  }
});


React.renderComponent(
  // TODO: <TestChart url='/ajax/status' />,
  <TestChart url='dummy.json' />,
  document.getElementById('content')
);


// Helpers
function browserName(browserHash) {
  return browserHash.name + ' (' + browserHash.majorVersion + ')';
}

function browserClassName(browserString) {
  return browserString.replace(/[\s\(\)\d]/g, '').toLowerCase();
}
