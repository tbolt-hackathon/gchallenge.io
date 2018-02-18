(function () {
	var APPTAG = 'gchallenge';
	var config = null, node = null;
	var templates = {};

	var auth = {
		loggedIn: !!localStorage.getItem('auth.login') && !!localStorage.getItem('auth.keys.pass'),
		login: function(){
			return localStorage.getItem('auth.login');
		},
		auth: function(login, pass){
			localStorage.setItem('auth.login', login);
			localStorage.setItem('auth.keys.pass', pass);
			auth.loggedIn = true;
		},
		checkAuth: function(success, fail){
			if(!auth.loggedIn) return;
			golos.api.getAccounts([auth.login()], function(err, response){

				console.log(auth.keys.pass(), response);
				if (!err && response && response.length > 0)
				{
					var roles = ['memo'];
					var keys = golos.auth.getPrivateKeys(auth.login(), auth.keys.pass(), roles);
					var resultWifToPublic = golos.auth.wifToPublic(keys.memo);
					console.log(response[0].memo_key, resultWifToPublic);
					if (response[0].memo_key == resultWifToPublic)
					{
						if(success != null) success();
						return;
					}
				}

				if(fail != null) fail();
				auth.clearStorage();
			});
		},
		clearStorage: function(){
			auth.loggedIn = false;
			localStorage.clear();
		},
		keys: {
			pass: function(){
				return localStorage.getItem('auth.keys.pass');
			},
			owner: function(){
				return auth.keys._getKey('owner');
			},
			posting: function(){
				return auth.keys._getKey('posting');
			},
			active: function(){
				return auth.keys._getKey('active');
			},
			memo: function(){
				return auth.keys._getKey('memo');
			},
			_getKey: function(role){
				if(!auth.loggedIn) return null;
				var key = localStorage.getItem('auth.keys.' + role);
				if(!key)
				{
					var wif = auth.keys.pass();
					if(!wif) return;
					var keys = golos.auth.getPrivateKeys(auth.login(), wif);
					for(var k in keys)
					{
						if(!keys.hasOwnProperty(k)) continue;
						localStorage.setItem('auth.keys.' + k, keys[k]);
						key = localStorage.getItem('auth.keys.' + role);
					}
				}
				return key;
			}
		}
	};

	function loadJson(file, done, fail) {
		$.ajax({
			url: '_config/' + file + '.json',
			dataType: 'json'
		}).done(function(data){
			if(done != null) done(data);
		}).fail(function(err) {
			$.ajax({
				url: 'https://raw.githubusercontent.com/tbolt-hackathon/gchallenge.io/master/_config/' + file + '.json',
				dataType: 'json'
			}).done(function(data){
				if(done != null) done(data);
			}).fail(function(err) {
				if(fail != null) fail(err);
			});
		});
	}

	function loadConfig(callback){
		loadJson('config', function(c){
			config = c;
			if(config != null && config.golos.node != null)
			{
				loadJson('nodes/' + config.golos.node, function(n){
					node = n;
					if(node != null)
					{
						golos.config.set('websocket', node.address);
						golos.config.set('chain_id', node.chainid);
						$('body > header > nav > a.golos-io').attr('href', node.webclient);

						if(callback != null) callback();
					}
				});
			}
		});
	}

	function loadTemplates(callback){
		$.ajax({
			url: 'views/article.htm',
			dataType: 'text'
		}).done(function(tpl){
			templates.article = tpl;
			if(callback && templates.article && templates.article_video && templates.comment) callback();
		});
		$.ajax({
			url: 'views/article_video.htm',
			dataType: 'text'
		}).done(function(tpl){
			templates.article_video = tpl;
			if(callback && templates.article && templates.article_video && templates.comment) callback();
		});
		$.ajax({
			url: 'views/comment.htm',
			dataType: 'text'
		}).done(function(tpl){
			templates.comment = tpl;
			if(callback && templates.article && templates.article_video && templates.comment) callback();
		});
	}
	
	function post(title, body)
	{
		comment(APPTAG, title, body);
	}

	function comment(permlink, title, body)
	{
		if(!auth.loggedIn)
		{
			alert('Sign in with golos please');
			$('section.signin, button.signin-signin').removeClass('hidden');
			return;
		}

		var meta = {};

		golos.broadcast.comment(auth.keys.posting(), '', permlink, auth.login(), 'gchallenges-' + (permlink === APPTAG ? '' : 'comment-') + Date.now(), title, body, JSON.stringify(meta), function(err, result){
			console.log(err, result);
		});
	}

	function loadPosts(){
		golos.api.getDiscussionsByCreated({select_tags: [APPTAG], limit: 100}, function(err, result){
			if(!err && result)
			{
				$('div.posts').empty();
				for(var k in result)
				{
					if(!result.hasOwnProperty(k)) continue;

					var post = result[k];

					var view = $(templates.article);
					view.find('.title').text(post.title);
					view.find('.author').text(post.author);
					view.find('.body').html(post.body);

					view.on('click', (function(p){
						return function(){
							location.hash = '#/challenges/@' + p.author + '/' + p.permlink.replace('gchallenges-', '');
						};
					})(post));

					$('div.posts').append(view);
				}
			}
		});
	}

	function handleURL() {
		if(!templates || !templates.article || !templates.article_video || !templates.comment)
		{
			loadTemplates(handleURL);
			return;
		}

		$('section.info').removeClass('hidden');
		$('section.post-info').addClass('hidden');

		if(location.hash.indexOf('#/challenges/@') === 0)
		{
			var url = location.hash.replace('#/challenges/@', '');
			var parts = url.split('/');
			var author = parts[0];
			var post = parts[1];

			golos.api.getContent(author, 'gchallenges-' + post, function(err, post){
				if(!err)
				{
					$('section.info').addClass('hidden');
					$('section.post-info').removeClass('hidden');

					$('div.posts').empty();

					var view = $(templates.article);
					view.find('.title').text(post.title);
					view.find('.author').text(post.author);
					view.find('.body').html(post.body);

					$('div.posts').append(view);

					golos.api.getContentReplies(post.author, post.permlink, function(err, result){
						if(result)
						{
							$('section.post-info > div.comments').empty();
							for(var k in result)
							{
								if(!result.hasOwnProperty(k)) continue;

								var comment = result[k];

								var view = $(templates.comment);
								console.log(templates.comment, view);
								view.find('.title').text(comment.title);
								view.find('.author').text(comment.author);
								view.find('.body').html(comment.body);

								$('section.post-info > div.comments').append(view);
							}
						}
					});
				}
			});
		}
		else
		{
			loadPosts();
		}
	}

	$(function(){
		loadConfig(function(){
			handleURL();
		});

		$(window).on('hashchange', handleURL);

		$('a.action-signin').on('click', function(){
			$('section.signin, button.signin-signin').toggleClass('hidden');
		});

		$('button.action-post').on('click', function(){
			$('div.new-challenge-overlay').removeClass('hidden');
		});

		$('a.new-challenge-dialog-close').on('click', function(){
			$('div.new-challenge-overlay').addClass('hidden');
		});

		$('button.action-post').on('contextmenu', function(){
			post('Test', 'Hello, world!');
		});

		function refreshAccountUI(){
			console.log('Posting key: ', auth.keys.posting());
			auth.checkAuth(function(){
				$('section.signin, button.signin-signin').addClass('hidden');
				$('a.action-signin').off('click').text('@' + auth.login());
			}, function(){
				alert('Invalid login or password');
			});
		}

		$('button.signin-signin').on('click', function(){
			var login = $('input.signin-login').val().trim();
			var pass = $('input.signin-password').val().trim();

			if(login.length < 1 || pass.length < 1) return;

			auth.auth(login, pass);

			refreshAccountUI();
		});

		refreshAccountUI();

		$('#addContentJson').on('click', function(){
			var item_number = 1 + (+$('.jsonAdd:last').data('number'));
			var utem_el = '<br><input type="text" class="form-control jsonAdd" id="battleJson['+item_number+']" data-nunber="'+item_number+'" placeholder="enter You video or picture url">';
			console.log(utem_el);
			$('.jsonAdd').append(utem_el);
		});
		$("input.signin-login, input.signin-password").keyup(function(e){
			if (e.keyCode === 13) {
				$("button.signin-signin").click();
			}
		});
	});
})();