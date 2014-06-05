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

    hostBrowsers = Object.keys(hostBrowsers).sort();
    clientBrowsers = Object.keys(clientBrowsers).sort();

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
    this.setState({selectedClient: this.state.clientBrowsers[i], selectedHost: null});
  },
  selectHost: function(i) {
    this.setState({selectedHost: this.state.hostBrowsers[i], selectedClient: null});
  },
  selectHostAndClientFromResult: function(i, j) {
    var selectedResult = this.state.results[i][j];
    this.setState({
      selectedClient: selectedResult.clientBrowser,
      selectedHost: selectedResult.hostBrowser
    });
  },

  isSelected: function(host, client) {
    return this.state.selectedClient === client || this.state.selectedHost === host
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
            onMouseEnter={this.selectHostAndClientFromResult.bind(this, i, j)} />
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
    var result = this.props.data;
    var classes = (this.props.selected ? 'selected ' : '') +
      'result ' + browserClassName(result.clientBrowser) + (result.result ? '' : ' empty');
    // TODO: create better results! Or more deets on hover.
    var pass = '';
    if (result.result) {
      if (result.result.data) {
        pass = 'Yes';
        classes += ' green';
      } else {
        pass = 'No';
        classes += ' red';
      }
    }
    return (
      <td className={classes} onMouseEnter={this.props.onMouseEnter} />
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
