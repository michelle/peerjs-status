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
      result.host = hostName;

      var clientName = browserName(result.client.browser);
      clientBrowsers[clientName] = 1;
      result.client = clientName;

      resultsByHost[hostName] = resultsByHost[hostName] || {};
      resultsByHost[hostName][clientName] = result;
    });

    hostBrowsers = Object.keys(hostBrowsers).sort();
    clientBrowsers = Object.keys(clientBrowsers).sort();

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
        return (
          <ResultCell
            data={result}
            selected={this.isSelected(host, result.client)}
            onMouseEnter={this.selectHostAndClientFromResult.bind(this, i, j)} />
        );
      }, this);

      var hostClasses = 'browser ' + browserClassName(host) +
        (this.state.selectedHost === host ? ' selected' : '');
      hostResults.unshift(
        <th className={hostClasses} onMouseEnter={this.selectHost.bind(this, i)}>
          {host}
        </th>
      );

      var resultsClasses = 'results ' + browserClassName(host);
      return (
        <tr className={resultsClasses}>
          {hostResults}
        </tr>
      );
    }, this);

    var clientBrowsers = this.state.clientBrowsers.map(function(browser, i) {
      var classes = 'browser ' + browserClassName(browser) +
        (this.state.selectedClient === browser ? ' selected' : '');
      return (
        <th className={classes} onMouseEnter={this.selectClient.bind(this, i)}>
          {browser}
        </th>
      );
    }, this);

    return (
      <table>
        <tr className="client browsers">
          <th></th>
          {clientBrowsers}
        </tr>
        {results}
      </table>
    );
  }
});


var ResultCell = React.createClass({
  render: function() {
    var result = this.props.data
    var classes = (this.props.selected ? 'selected ' : '') +
      'result ' + browserClassName(result.client) + (result.result ? '' : ' empty');
    // TODO: create better results! Or more deets on hover.
    var pass = '';
    if (result.result) {
      pass = result.result.data ? 'Yes' : 'No';
    }
    return (
      <td className={classes} onMouseEnter={this.props.onMouseEnter}>
        {pass}
      </td>
    )
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
  return browserString.replace(/[\s\(\)]/g, '').toLowerCase();
}
