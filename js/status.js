/** @jsx React.DOM */
var TestChart = React.createClass({displayName: 'TestChart',
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
      result.host = hostName;

      var clientName = browserName(result.client.browser);
      clientBrowsers[clientName] = 1;
      result.client = clientName;

      resultsByHost[hostName] = resultsByHost[hostName] || {};
      resultsByHost[hostName][clientName] = result;
    });

    hostBrowsers = Object.keys(hostBrowsers);
    clientBrowsers = Object.keys(clientBrowsers);

    // First level: host, second nested level: client.
    var results = [];
    hostBrowsers.map(function(hostBrowser, i) {
      results[i] = [];
      clientBrowsers.map(function(clientBrowser, j) {
        results[i][j] = resultsByHost[hostBrowser][clientBrowser] || {host: hostBrowser, client: clientBrowser};
      });
    });
    this.setState({results: results, hostBrowsers: hostBrowsers, clientBrowsers: clientBrowsers});
  },

  selectClient: function(i) {
    this.setState({selectedClient: this.state.clientBrowsers[i], selectedHost: null});
  },
  selectHost: function(i) {
    this.setState({selectedHost: this.state.hostBrowsers[i], selectedClient: null});
  },
  selectHostAndClientFromResult: function(i, j) {
    var selectedResult = this.state.results[i][j];
    this.setState({
      selectedClient: selectedResult.client,
      selectedHost: selectedResult.host
    });
  },

  isSelected: function(host, client) {
    return this.state.selectedClient === client || this.state.selectedHost === host
  },

  render: function() {
    var results = this.state.results.map(function(hostResults, i) {
      var host = hostResults[0].host;
      hostResults = hostResults.map(function(result, j) {
        if (host !== result.host) {
          console.error('Hosts don\'t match in the same column!!');
        }
        var classes = (this.isSelected(host, result.client) ? 'selected ' : '') +
          'result ' + browserClassName(result.client) + (result.result ? '' : ' empty');
        // TODO: create better results! Or more deets on hover.
        var pass = '';
        if (result.result) {
          pass = result.result.data ? 'Yes' : 'No';
        }
        return (
          React.DOM.th( {className:classes, onMouseEnter:this.selectHostAndClientFromResult.bind(this, i, j)}, 
            pass
          )
        );
      }, this);

      var hostClasses = 'browser ' + browserClassName(host) +
        (this.state.selectedHost === host ? ' selected' : '');
      hostResults.unshift(
        React.DOM.th( {className:hostClasses, onMouseEnter:this.selectHost.bind(this, i)}, 
          host
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
      var classes = 'browser ' + browserClassName(browser) +
        (this.state.selectedClient === browser ? ' selected' : '');
      return (
        React.DOM.th( {className:classes, onMouseEnter:this.selectClient.bind(this, i)}, 
          browser
        )
      );
    }, this);

    return (
      React.DOM.table(null, 
        "Test results will go here!",

        React.DOM.tr( {className:"client browsers"}, 
          React.DOM.th(null),
          clientBrowsers
        ),

        results
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

function browserClassNameFromHash(browserHash) {
  return browserHash.name.toLowerCase() + '' + browserHash.majorVersion;
}

function browserClassName(browserString) {
  return browserString.replace(/[\s\(\)]/g, '').toLowerCase();
}
