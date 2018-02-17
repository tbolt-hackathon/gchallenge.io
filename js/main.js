(function () {
	var config = null, node = null;

	function loadConfig() {
		$.ajax({
			url: '_config/config.json',
			dataType: 'json'
		}).done(function(c){
			config = c;
			if(config != null && config.golos.node != null)
			{
				$.ajax({
					url: '_config/nodes/' + config.golos.node + '.json',
					dataType: 'json'
				}).done(function(n){
					node = n;
					if(node != null)
					{
						golos.config.set('websocket', node.address);
						golos.config.set('chain_id', node.chainid);
						$('body > header > nav > a.golos-io').attr('href', node.webclient);
					}
				});
			}
		});
	}

	$(function(){
		loadConfig();
	});

})();