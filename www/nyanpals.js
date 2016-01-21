
(function(window, document){
	var nyanpals = {};
	var preferences;
	var options;
	var optionManager;
	var emoticons;
	var emoticonManager;
	var publicationSettings;
	var publicationManager;
	var thumbnailSizes = ["50px", "75px", "100px", "125px", "auto"];
	var sortingMethods = ["No Sort","Frequency", "Tag", "Frequency + Tag"];
	var chatButtonCollection;
	var register = false;
	var infoPanel;
	var chat;

	var initialize = function()
	{
		nyanpals.id = new ID();
		nyanpals.focus = false;
		nyanpals.videoPanel = new VideoPanel();
		nyanpals.websocket = new WebSocketWrapper();
		nyanpals.inputHistory = new InputHistory();
		nyanpals.events = Events;
		nyanpals.sound = new SoundManager();
		chat = new Chat();
		
		nyanpals.websocket.initialize();
		chat.login.setError("");
		try
		{
			if ( $ )
			{

			}
		}
		catch(exception)
		{
			chat.login.setError("nyanpals uses jQuery, but it hasn't loaded for some reason. Things will break!");
		}

		chat.parsers.push(new FilterParser());
		chat.parsers.push(new AutolinkerParser());
		chat.parsers.push(new EmoticonParser());
		chat.parsers.push(new AlertParser());
		chatButtonCollection = new ChatButtonCollection();
		chatButtonCollection.add("emoticonButton", "fa fa-smile-o",
			function ()
			{
				emoticonManager.toggle();
			}
		);
		chatButtonCollection.add("optionButton", "fa fa-wrench",
			function ()
			{
				optionManager.toggle();
			}
		);
		chatButtonCollection.add("streamInfoButton", "fa fa-video-camera",
			function ()
			{
				publicationManager.toggle();
			}
		);
		chatButtonCollection.add("infoButton", "fa fa-info",
			function ()
			{
				infoPanel.toggle();
			}
		);

		/* Info Panel */

		infoPanel = new InfoPanel();


		/* Preferences */

		preferences = new PreferenceCollection();
		preferences.add("emoticonInfo",
		{
			"thumbnailIndex": 3,
			"tabs":
			{},
			"sortingIndex": 0
		});

		preferences.add("messageSound", "./snd/newmessage.wav");
		preferences.add("quietWhileFocused", true);
		preferences.add("soundOnMessage", true);
		preferences.add("soundOnPrivateMessage", true);
		preferences.add("soundOnUserJoin", true);
		preferences.add("soundOnUserLeave", true);
		preferences.add("emoticonLists", "./emoticons.json");
		preferences.add("filters", "");
		preferences.add("mention", true);
		preferences.add("alerts", "");
		preferences.add("showBandwidthUsage", false);

		preferences.load();
		preferences.save();

		/* Options */

		options = new OptionCollection();
		options.add("soundOnMessage", new BooleanOption("Message Sounds", "soundOnMessage"));
		options.add("soundOnPrivateMessage", new BooleanOption("Private Message Sounds", "soundOnPrivateMessage"));
		options.add("quietWhileFocused", new BooleanOption("Quiet While Focused", "quietWhileFocused"));
		options.add("messageSound", new TextareaOption("Message Sound URL", "messageSound"));
		options.add("soundOnUserJoin", new BooleanOption("User Join Sounds", "soundOnUserJoin"));
		options.add("soundOnUserLeave", new BooleanOption("User Leave Sounds", "soundOnUserLeave"));
		options.add("mention", new BooleanOption("Alert On Mention", "mention"));
		options.add("alerts", new TextareaOption("Alerts (new line separated)", "alerts"));
		options.add("showBandwidthUsage", new BooleanOption("Show Bandwidth Usage", "showBandwidthUsage"));
		options.add("emoticonLists", new TextareaOption("Emoticon Lists (new line separated)", "emoticonLists"));
		options.add("filters", new TextareaOption("Filters (regex, quoted strings, pairs/new line separated)", "filters"));
		options.add("importexport", new ImportExportOption());
		options.load();

		optionManager = new OptionManager();
		optionManager.hide();
		optionManager.add("soundOnMessage", options.get("soundOnMessage"));
		optionManager.add("soundOnPrivateMessage", options.get("soundOnPrivateMessage"));
		optionManager.add("quietWhileFocused", options.get("quietWhileFocused"));
		optionManager.add("messageSound", options.get("messageSound"));
		optionManager.add("soundOnUserJoin", options.get("soundOnUserJoin"));
		optionManager.add("soundOnUserLeave", options.get("soundOnUserLeave"));
		optionManager.add("mention", options.get("mention"));
		optionManager.add("alerts", options.get("alerts"));
		optionManager.add("showBandwidthUsage", options.get("showBandwidthUsage"));
		optionManager.add("emoticonLists", options.get("emoticonLists"));
		optionManager.add("filters", options.get("filters"));
		optionManager.add("importexport", options.get("importexport"));

		$(document).on('click', function (event)
		{
			if (!$(event.target).closest(optionManager.element).length &&
				!$(event.target).closest(chatButtonCollection.get("optionButton").element).length)
			{
				optionManager.hide();
			}
		});
		document.body.appendChild(optionManager.element);

		/* Emoticons */

		emoticons = new EmoticonCollection();
		emoticonManager = new EmoticonManager();
		emoticonManager.hide();

		$(document).on('click', function (event)
		{
			if (!$(event.target).closest(emoticonManager.element).length &&
				!$(event.target).closest(chatButtonCollection.get("emoticonButton").element).length &&
				!$(event.target).closest(chat.input.element).length)
			{
				emoticonManager.hide();
			}
		});
		document.body.appendChild(emoticonManager.element);

		updateEmoticonManager();

		/* Publication */

		publicationSettings = new PublicationSettingCollection();
		publicationSettings.add("streamInfo",new PublicationInfoPublicationSetting());
		publicationSettings.add("streamRestrictions",new PublicationRestrictionsPublicationSetting());

		publicationManager = new PublicationManager();
		publicationManager.hide();
		publicationManager.add("streamInfo",publicationSettings.get("streamInfo"));
		publicationManager.add("streamRestrictions",publicationSettings.get("streamRestrictions"));
		
		$(document).on('click', function (event)
		{
			if (!$(event.target).closest(publicationManager.element).length &&
				!$(event.target).closest(chatButtonCollection.get("streamInfoButton").element).length)
			{
				publicationManager.hide();
			}
		});
		document.body.appendChild(publicationManager.element);


		/* Video Panel */

		/* Drag */

		var isResizing = false,
		lastDownY = 0;

		$(function ()
		{
			var container = $('#tableContainer'),
				top = $('#videosCell'),
				bottom = $('#chatAreaWrapperCell'),
				handle = $('#drag');

			handle.on('mousedown', function (e)
			{
				isResizing = true;
				lastDownY = e.clientY;
			});

			$(document).on('mousemove', function (e)
			{
				// we don't want to do anything if we aren't resizing.
				if (!isResizing)
					return;

				var offsetBottom = container.height() - (container.height() - (e.clientY - container.offset().top));

				top.css('height', offsetBottom);
				//chat.scrollToBottom();
				// right.css('width', offsetRight);
			}).on('mouseup', function (e)
			{
				// stop resizing
				isResizing = false;
			});
		});

		/* Window and Events */


		window.addEventListener("focus", function()
		{
			if (nyanpals.websocket.connected && chat.activeRoom != null)
			{
				chat.input.focus();
			}
		});

		if ( window.location.protocol == "https:")
		{
			document.getElementById("btnRegister").style.display = "inline-block";
			document.getElementById("btnRegister").onclick = function()
			{
				document.getElementById("confirmPasswordWrapper").style.display = "table";
				document.getElementById("btnRegister").style.display = "none";
				document.getElementById("btnCancelRegister").style.display = "inline-block";
				register = true;
			}
			document.getElementById("btnCancelRegister").onclick = function()
			{
				document.getElementById("btnRegister").style.display = "inline-block";
				document.getElementById("btnCancelRegister").style.display = "none";
				register = false;
			}
			document.getElementById("passwordWrapper").style.display = "table";
		}

		document.addEventListener("onChatMessage",
			function (event)
			{	
				if (preferences.get("soundOnMessage"))
				{
					if ( preferences.get("quietWhileFocused") && (!nyanpals.focus || event.detail.room != chat.activeRoom) || !preferences.get("quietWhileFocused") )
					{
						nyanpals.sound.play(preferences.get("messageSound"));
					}
				}
			}, false
		);

		document.addEventListener("onPrivateMessage",
			function (event)
			{	
				if (preferences.get("soundOnPrivateMessage"))
				{
					if ( preferences.get("quietWhileFocused") && (!nyanpals.focus || event.detail.room != chat.activeRoom) || !preferences.get("quietWhileFocused") )
					{
						nyanpals.sound.play("./snd/privatemessage.wav");
					}
				}
			}, false
		);

		document.addEventListener("onUserJoinRoom",
			function (event)
			{
				if (preferences.get("soundOnUserJoin"))
				{
					nyanpals.sound.play("./snd/userconnect.wav");
				}
			}, false
		);

		document.addEventListener("onUserLeaveRoom",
			function (event)
			{
				if (preferences.get("soundOnUserLeave"))
				{
					nyanpals.sound.play("./snd/userdisconnect.wav");
				}
			}, false
		);

		document.getElementById("btnCloseStreamHelp").onclick = function ()
		{
			document.getElementById("streamHelp").style.display = "none";
		}

		window.onbeforeunload = function ()
		{
			for ( var k in nyanpals.videoPanel.viewing )
			{
				stopWatching(k);
			}
			nyanpals.websocket.send("onUserLeaveChat",
			{
				"username": chat.user.name
			});
			nyanpals.websocket.socket.close();
		}

		window.onblur = function (event)
		{
			nyanpals.focus = false;
		}

		window.onfocus = function (event)
		{
			unIdle();
			nyanpals.focus = true;
		}
		window.onmousemove = function (event)
		{
			unIdle();
		}

		window.onkeydown = function (event)
		{
			unIdle();
		}

		/* send all errors to chat in the form of system messages 
		for debugging assistance */
		window.onerror = function(msg, url, line, col, error) {
		   // Note that col & error are new to the HTML 5 spec and may not be 
		   // supported in every browser.  It worked for me in Chrome.
		   var extra = !col ? '' : '\ncolumn: ' + col;
		   extra += !error ? '' : '\nerror: ' + error;

		   // You can view the information in an alert to see things working like this:
		   chat.addSystemMessage("system","UNHANDLED EXCEPTION ERROR: " + msg + "\nurl: " + url + "\nline: " + line + extra,"fa fa-exclamation","#FF0","#F00");
		   chat.addSystemMessage("system","Please let a developer know about this!","fa fa-exclamation","#FF0","#F00");
		   console.log("UNHANDLED EXCEPTION ERROR: " + msg + "\nurl: " + url + "\nline: " + line + extra);
		   nyanpals.sound.play("./snd/exception.wav");

		   // TODO: Report this error via ajax so you can keep track
		   //       of what pages have JS issues

		   var suppressErrorAlert = true;
		   // If you return true, then error alerts (like in older versions of 
		   // Internet Explorer) will be suppressed.
		   return suppressErrorAlert;
		};

		if (chat.login.txtUsername.value == "") {
			chat.login.txtUsername.focus();
		}
		else
		{
			chat.login.txtPassword.focus();
		}

		chat.login.refreshColor();
		setInterval(tick, 1000);
	}

	var createPopoutStream = function(username,stream)
	{
		var location = window.location.protocol + "//" + window.location.hostname + "/popout.html";
		var popout = window.open(location,"nyanpals popout stream");
		popout.nyanpalsPopout = {username:username,stream:stream,token:chat.user.token};
	}

	var getWordIndexUnderCaret = function(element)
	{
	  var start = element.selectionStart;
	  var end = element.selectionStart;

	  while( start > 0 )
	  {
	    if ( element.value[start] == " ")
	    {
	   		start++;
	    	break;
	    }
	  	start--;
	  }
	  while( end < element.value.length )
	  {
	    if ( element.value[end] == " ")
	    {
	      break;
	    }
	  	end++;
	  }
	  return {start:start,end:end};
	}

	var scoreStringCompare = function( target, entry)
	{
		var score = 0;
		for ( var i = 0 ;i < target.length; i++)
		{
			var char = target[i];
			if ( entry.indexOf(char) != -1)
			{
				score++;
				if ( Math.abs(entry.indexOf(char) - 1) < 3)
				{
					score += 3 - Math.abs(entry.indexOf(char)-i);
				}
			}
			else
			{
				score--;
			}
		}
		for ( var i = 0; i < Math.min(target.length, entry.length); i++)
		{
			var consecutive = 0;
			if ( target[i] === entry[i])
			{
				score += (++consecutive)+8;
			}
			else if ( target[i].toLowerCase() === entry[i].toLowerCase())
			{
				score += ++consecutive+4;
			}
			else
			{
				score--;
				consecutive = 0;
			}
		}
		for ( var i = 0; i < target.length; i++)
		{
			var checkLength = Math.min(target.length - i, entry.length);
			if ( entry.substr(0,checkLength) === target.substr(0,checkLength))
			{
				score += checkLength * checkLength;
			}
			else if ( entry.substr(0,checkLength).toLowerCase() === target.substr(0,checkLength).toLowerCase())
			{
				score += checkLength;
			}
		}
		return score;
	}

	var findRegexRanges = function(regex,modifiers,search)
	{
		var ranges = [];
		var regex = new RegExp(regex,modifiers);
	  var match = regex.exec(search);
	  while( match != null)
	  {
	  	ranges.push({start:match.index,end:match.index+match[0].length,match:match});
	    match = regex.exec(search);
	  }
	  return ranges;
	}

	var parseQuotedString = function(quoted)
	{
		var split = [];
	  var inString = false;
	  var build = "";
	  var c = 1000;
	  while ( quoted.length > 0 && c > 0)
	  {
	  	if (quoted[0] === " " && !inString )
	    {
	      if ( build.length> 0)
	      {
	       split.push(build);
	      }
	      build = "";
	    }
	    else if (quoted.substr(0,2) === "\\\"")
	    {
	      quoted = quoted.substr(1);
	      build += "\"";
	    }
	    else if ( quoted.substr(0,1) == "\"")
	    {
	     inString = !inString;
	    }
	    else
	    {
	    	build += quoted[0];
	    }
	    quoted = quoted.substr(1);
	    c--;
	  }
	  if ( build.length > 0 )
	  {
	    split.push(build);
	  }
	  return split;
	}

	var getBestGuessString = function(test,cases)
	{
		var scores = [];
		for (var k in cases)
		{
			scores.push({"case":cases[k],"score":scoreStringCompare(test,cases[k])});
		}
		scores.sort(function(a,b)
		{
			if (a.score < b.score) return 1;
			if (a.score > b.score) return -1;
			return 0;
		});
		return scores[0].case;
	}

	var updateEmoticonManager = function()
	{
		for (k in preferences.get("emoticonInfo").tabs)
		{
			var tab = preferences.get("emoticonInfo").tabs[k];
			emoticonManager.addTab(tab);
		}
	}

	var tick = function ()
	{
		chat.idleStrikes--;
		if (chat.idleStrikes == 0)
		{
			if (nyanpals.websocket)
			{
				nyanpals.websocket.send("onUserIdle");
			}
		}
		if (preferences.get("showBandwidthUsage"))
		{
			for ( var k in chat.users)
			{
				if ( chat.users[k].streaming )
				{
					nyanpals.websocket.send("onRequestUserInfo",{user:k,room:chat.activeRoom});
				}
			}
		}
	}

	var unIdle = function ()
	{
		if (chat.idleStrikes <= 0)
		{
			nyanpals.websocket.send("onUserReturn");
		}
		chat.idleStrikes = chat.idleStrikesMax;
	}

	var createDiceRollElement = function (roll)
	{
		var element = document.createElement("div");
		element.className = "diceRollWrapper";

		if (roll.note != null && roll.note.length > 0)
		{
			var rollNote = document.createElement("span");
			rollNote.className = "diceRollNote";
			rollNote.appendChild(document.createTextNode(roll.note));
			element.appendChild(rollNote);
		}

		var rollIcon = document.createElement("i");
		rollIcon.className = "diceRollIcon fa fa-cube";
		rollIcon.title = "Server Dice Roll";
		element.appendChild(rollIcon);

		var createToken = function (message)
		{
			var element = document.createElement("span");
			element.className = "diceRollToken";
			element.appendChild(document.createTextNode(message));
			return element;
		}

		for (var i = 0; i < roll.rolls.length; i++)
		{
			var rolls = roll.rolls;
			var string = "(";
			rolls[i].subtract ? element.appendChild(createToken("-")) : i > 0 ? element.appendChild(createToken("+")) : null;
			for (var j = 0; j < rolls[i].rolls.length - 1; j++)
			{
				string += rolls[i].rolls[j] + "+";
			}
			string += rolls[i].rolls[rolls[i].rolls.length - 1] + ")";

			var rollElement = document.createElement("span");
			rollElement.className = "diceRoll";
			rollElement.appendChild(document.createTextNode(string));
			element.appendChild(rollElement);
		}
		element.appendChild(createToken("="))
		var rolls = roll.rolls;
		var string = roll.total;
		var rollElement = document.createElement("span");
		rollElement.className = "diceRollTotal";
		rollElement.appendChild(document.createTextNode(string));
		element.appendChild(rollElement);

		return element;
	}

	var reloadEmoticons = function ()
	{
		emoticonManager.clearEmoticons();
		emoticons.reload();
	}

	var refreshEmoticons = function ()
	{
		emoticonManager.clearEmoticons();
		emoticons.refresh();
	}

	function regexMatch(text, pattern)
	{
		var regex = new RegExp(pattern);
		return regex.test(text);
	}

	var getUser = function(username)
	{
		return chat.users[username];
	}

	var createStreamAccessMessageElement = function(username)
	{
		var messageElement = document.createElement("div");
		messageElement.appendChild( document.createTextNode(username + " is requesting access to view your stream."));
		var answered = false;
		var allow = document.createElement("a");
		allow.style.paddingLeft = "4px";
		allow.href = "#";
		allow.appendChild(document.createTextNode("Allow"));
		allow.onclick = function()
		{
			if (!answered)
			{
				nyanpals.websocket.send("onAllowStreamInfo",
					{
						"username": username
				});
				answered = true;
			}
		}
		var refuse = document.createElement("a");
		refuse.style.paddingLeft = "4px";
		refuse.href = "#";
		refuse.appendChild(document.createTextNode("Refuse"));
		refuse.onclick = function()
		{
			if (!answered)
			{
				nyanpals.websocket.send("onRefuseStreamInfo",
				{
					"username": username
				});
				answered = true;
			}
		}
		messageElement.appendChild(allow);
		messageElement.appendChild(refuse);
		return new ChatMessage("system", null, messageElement, null);
	}

	var makeElementAutoScrolling = function (element)
	{
		var autoScroll = true;
		var scrollElement = function ()
		{
			if (autoScroll)
			{
				element.scrollTop = element.scrollHeight - element.clientHeight;
			}
		}
		var scrollObserver = new MutationObserver(function (mutations)
		{
			scrollElement();
		});
		element.addEventListener("scroll", function ()
		{
			if (Math.abs(element.scrollTop - (element.scrollHeight - element.clientHeight))>5)
			{
				autoScroll = false;
			}
			else
			{
				autoScroll = true;
			}
		});
		scrollObserver.observe(element,
		{
			childList: true,
			subtree: true
		});
		element.addEventListener("change", function ()
		{
			scrollElement();
		});
	}

	var attemptAuthenticate = function ()
	{
		var error = null;
		chat.login.setError("");
		if (nyanpals.websocket.connected)
		{
			var username = chat.login.getUsername();
			if (username.length > 0)
			{
				if (username.length <= 14)
				{
					if (username.indexOf(" ") == -1)
					{
						if ( !register || (register && chat.login.confirmPassword()) )
						{
							chat.user.name = username;

							nyanpals.websocket.send("onAuthenticate",
							{
								"username": username,
								"password": Sha256.hash(chat.login.getPassword()),
								"protocol": window.location.protocol,
								"register": register
							});
						}
						else
						{
							error = "Passwords do not match";
						}
					}
					else
					{
						error = "Username can not contain spaces";
					}
				}
				else
				{
					error = "Username must be 14 characters or shorter";
				}
			}
			else
			{
				error = "Username must not be blank";
			}
		}
		else
		{
			error = "Not connected to nyanpals";
		}
		if (error)
		{
			chat.login.show();
			chat.login.setError(error);
		}
	}

	var or = function (a, b)
	{
		if (a)
		{
			return a;
		}
		return b;
	}

	var getTimestamp = function ()
	{
		var date = new Date();
		var hours = String(date.getHours());
		if (hours.length == 1)
		{
			hours = "0" + hours;
		}
		var minutes = String(date.getMinutes());
		if (minutes.length == 1)
		{
			minutes = "0" + minutes;
		}

		return hours + ":" + minutes;
	}

	var startWatching = function(username)
	{
		nyanpals.websocket.send("onUserJoinStream",
		{
			"publisher": username,
			"room": chat.activeRoom
		});
		nyanpals.videoPanel.viewing[username] = true;
	}

	var stopWatching = function(username)
	{
		if (nyanpals.videoPanel.viewing[username])
		{
			nyanpals.videoPanel.removePlayer(nyanpals.videoPanel.linking[username]);
			nyanpals.websocket.send("onUserLeaveStream",
			{
				"publisher": username,
				"room": chat.activeRoom
			});
			delete(nyanpals.videoPanel.viewing[username]);
			delete(nyanpals.videoPanel.linking[username]);
		}
	}

	var SoundManager = function()
	{
		var manager = {};
		manager.sounds = {};
		manager.play = function(path)
		{
			if (manager.sounds[path])
			{
				manager.sounds[path].play();
			}
			else
			{
				manager.sounds[path] = new Audio(path);
				manager.sounds[path].play();
			}
		}
		return manager;
	}

	var WebSocketWrapper = function()
	{
		var websocket = {};
		websocket.host = null;
		websocket.connected = false;
		websocket.shouldReconnect = true;
		websocket.socket = null;
		websocket.keepAliveInterval = 5000;
		websocket.keepAliveTimeout = null;
		websocket.keepAliveStrikesMax = 5;
		websocket.keepAliveStrikes = websocket.keepAliveStrikesMax;
		websocket.reconnectTimeInitial = 1000;
		websocket.reconnectTime = websocket.reconnectTimeInitial;
		websocket.reconnecting = false;
		websocket.attemptReconnect = function ()
		{
			try
			{
				if ( websocket.connected == false && websocket.shouldReconnect)
				{
					clearInterval(websocket.keepAliveTimeout);
					websocket.keepAliveTimeout = null;
					websocket.reconnecting = true;
					websocket.socket.close();
					delete(websocket);
					chat.addSystemMessage("system", "Attempt reconnect...", "fa fa-question");
					websocket.initialize();
					websocket.reconnectTime *= 2;
				}
			}
			catch (ex)
			{
			}
		}

		websocket.keepAlive = function()
		{
			websocket.send("onKeepAlive");
			websocket.keepAliveStrikes--;
			if (websocket.keepAliveStrikes == 0)
			{
				clearInterval(websocket.keepAliveTimeout);
				chat.addSystemMessage("system","Connection timed out",  "fa fa-close");
				chat.clearUserLists();
				websocket.connected = false;
				websocket.attemptReconnect();
			}
			websocket.keepAliveTimeout = setTimeout(websocket.keepAlive, websocket.keepAliveInterval );
		}
		websocket.onSocketOpen = function ()
		{
			websocket.connected = true;
			if (websocket.reconnecting)
			{
				attemptAuthenticate();
			}
			else
			{
				// If I REALLY want to leave the pre-emptive view in... this line will do that
				websocket.send("onRequestUserList",{room:"nyanpals"});
				nyanpals.websocket.send("onRequestUsersOnline");
			}
		}
		websocket.onSocketMessage = function (msg)
		{
			var data = msg.data;
			var response = JSON.parse(data);
			var request = response[0];
			var data = response[1];
			if (request === "onAuthenticate")
			{
				if (data.success)
				{
					websocket.reconnecting = false;
					websocket.reconnectTime = websocket.reconnectTimeInitial;
					websocket.keepAliveStrikes = websocket.keepAliveStrikesMax;
					chat.login.hide();
					chat.input.focus();
					websocket.send("onUserJoinRoom",
					{
						room:chat.login.getRoom()
					});
					websocket.send("onRequestAuthenticationToken",{});
					var colors = Color.calculateStringColors(chat.user.name);
					document.getElementById("inputUsername").childNodes[0].nodeValue = chat.user.name;
					document.getElementById("inputUsername").className = "chatSender user_" + chat.user.name;
					document.getElementById("inputUsername").parentNode.className += " sender_" + chat.user.name;
					document.getElementById("inputUsername").parentNode.style.backgroundColor = "rgb(" + colors.r + "," + colors.g + "," + colors.b + ")";
					if ( websocket.keepAliveTimeout == null)
					{
						websocket.keepAlive();
					}
					chat.input.focus();
					var lists = preferences.get("emoticonLists").split("\n");
					for ( var k in lists)
					{
						emoticons.loadList(lists[k]);
					}
				}
				else
				{
					chat.login.setError(data.message);
				}
			}
			else if (request === "onUsersOnline")
			{
				document.getElementById("usersOnline").childNodes[0].nodeValue = data + " users online";
			}
			else if (request === "onAuthenticationToken")
			{
				chat.user.token = data.token;
			}
			else if (request === "onUserMessage")
			{
				if ( chat.rooms[data.room] )
				{
					chat.rooms[data.room].addChatMessage(data.username, data.username, data.message ,data.timestamp );
					if ( data.room != chat.activeRoom)
					{
						chat.rooms[data.room].alert();
					}
					if (data.username != chat.user.name)
					{
						Events.onChatMessage(data.room);
					}
				}
			}
			else if (request === "onUserJoinRoom")
			{
				if ( data.username === chat.user.name )
				{
					if ( chat.rooms[data.room] == null)
					{
						chat.addRoom(data.room,new ChatRoom(data.room, "#"+data.room),true);
					}
				}
				else
				{
					if ( chat.rooms[data.room] )
					{
						chat.rooms[data.room].addSystemMessage("system",data.username + " joined the room","fa fa-sign-in")
						if ( chat.activeRoom == data.room )
						{
							chat.rooms[data.room].refreshUserList(true);
						}
						websocket.send("onRequestUserInfo",{user:data.username,room:data.room});
						Events.onUserJoinRoom();
					}
				}
			}
			else if (request === "onUserLeaveRoom")
			{
				if ( data.username === chat.user.name )
				{
					if ( chat.rooms[data.room])
					{
						chat.removeRoom(data.room);
					}
				}
				else
				{
					if ( chat.rooms[data.room] )
					{
						chat.rooms[data.room].addSystemMessage("system",data.username + " left the room","fa fa-sign-out")
						chat.updateUser(data.username, null, data.room);
						if ( chat.activeRoom == data.room )
						{
							chat.rooms[data.room].refreshUserList(true);
						}
						Events.onUserLeaveRoom();
					}
				}
			}
			else if (request === "onKick")
			{
				chat.addSystemMessage("system", "You were removed from the chat", "fa fa-sign-out");
				chat.clearUserLists();
				nyanpals.websocket.socket.close();
				nyanpals.websocket.connected = false;
				nyanpals.websocket.shouldReconnect = false;
			}
			else if (request === "onUserKicked")
			{
				chat.addSystemMessage("system", data.username + " was removed from the chat", "fa fa-sign-out");
				chat.updateUser(data.username, null, data.room);
			}
			else if (request === "onUserBanned")
			{
				chat.addSystemMessage("system", data.username + " was banned from the chat", "fa fa-sign-out");
				chat.updateUser(data.username, null, data.room);
			}
			else if (request === "onRefreshEmoticons")
			{
				chat.addSystemMessage("system", "The server called for an emoticon reload", "fa fa-refresh");
				reloadEmoticons();
			}
			else if (request === "onUserDisconnect")
			{
				if ( chat.users[data.username])
				{
					chat.addSystemMessage("system", data.username + " disconnected",  "fa fa-close")
				}
				chat.updateUser(data.username, null, data.room)
			}
			else if (request === "onDisconnect")
			{
				chat.addSystemMessage("system", data.message, "fa fa-close")
				chat.clearUserLists();
			}
			else if (request === "onReceiveMessage")
			{
				if (!data.system)
				{
					chat.addChatMessage(data.username,data.username,data.message,data.timestamp);
					if (data.username != chat.user.name)
					{
						Events.onChatMessage(data.room);
					}
				}
				else
				{
					chat.addSystemMessage("system", data.message, data.icon);
				}
			}
			else if (request === "onPollOpened")
			{
				if (data.room)
				{
					chat.rooms[data.room].addSystemMessage("system",data.username + " has opened a poll: " + data.description);
					for ( var i= 0; i < data.options.length; i++ )
					{
						chat.rooms[data.room].addSystemMessage("system", "option [" + (i+1) +"]: " + data.options[i] );
					}
					chat.rooms[data.room].addSystemMessage("system", "type /vote 1-" + data.options.length+" to cast your vote before the poll closes" );
				}
			}
			else if (request === "onPollClosed")
			{
				if (data.room)
				{
					var highestTally = 0;
					var winner = -1;
					chat.rooms[data.room].addSystemMessage("system", "The poll \"" + data.description + "\" has ended" );
					for ( var i= 0; i < data.options.length; i++ )
					{
						if (data.tally[i] > highestTally)
						{
							winner = i;
							highestTally = data.tally[i];
						}
						chat.rooms[data.room].addSystemMessage("system", " \"" + data.options[i] + "\" got " + data.tally[i] + " vote(s)" );
					}
					chat.rooms[data.room].addSystemMessage("system", "\"" + data.options[winner] +"\" has won with " + highestTally + " vote(s)" );
					chat.rooms[data.room].addSystemMessage("system", "Thanks for voting!" );
				}
			}
			else if (request === "onShutdown")
			{
				chat.clearUserLists();
				chat.addSystemMessage("system", data.message, "fa fa-close");
				websocket.socket.close();
				websocket.connected = false;
				websocket.attemptReconnect();
			}
			else if (request === "onUserPublish")
			{
				if (data.room )
				{
					if (chat.users[data.username])
					{
						chat.users[data.username].streaming = true;
					}

					if (chat.rooms[data.room].userList.entries[data.username])
					{
						chat.rooms[data.room].userList.entries[data.username].showPublisher();
					}
					nyanpals.sound.play("/snd/userstream.wav");
					chat.rooms[data.room].addSystemMessage("system", data.username + " has started streaming", "fa fa-eye");
					chat.rooms[data.room].userList.sort();
				}
			}
			else if (request === "onUserUnpublish")
			{
				if (data.room )
				{
					if (chat.users[data.username])
					{
						chat.users[data.username].streaming = false;
					}
					if (chat.rooms[data.room].userList.entries[data.username])
					{
						chat.rooms[data.room].userList.entries[data.username].hidePublisher();
					}
					stopWatching(data.username);
					chat.rooms[data.room].addSystemMessage("system", data.username + " has stopped streaming", "fa fa-eye-slash");
					chat.rooms[data.room].userList.sort();
				}
			}
			else if (request === "onUserJoinStream")
			{
				chat.addSystemMessage("system", data.username + " has started watching your stream", "fa fa-eye");
				for ( var k in chat.rooms )
				{
					if ( chat.rooms[k] && chat.rooms[k].userList.entries[data.username] )
					{
						chat.rooms[k].userList.entries[data.username].showViewer();
					}
				}
				nyanpals.sound.play("./snd/streamviewer.wav");
			}
			else if (request === "onUserLeaveStream")
			{
				if (data.room )
				{
					chat.addSystemMessage("system", data.username + " has stopped watching your stream", "fa fa-eye-slash");
					for ( var k in chat.rooms )
					{
						if ( chat.rooms[k] && chat.rooms[k].userList.entries[data.username] )
						{
							chat.rooms[k].userList.entries[data.username].hideViewer();
						}
					}
				}
			}
			else if (request === "onUserInfo")
			{
				if (data.users)
				{
					for (var i = 0; i < data.users.length; i++)
					{
						chat.updateUser(data.users[i].username, data.users[i], data.room);
					}
				}
			}
			else if (request === "onUpdatePublicationSettings")
			{
				if (nyanpals.videoPanel.viewing[data.username])
				{
					nyanpals.videoPanel.getPlayer(data.username).showRestriction();
				}
			}
			else if (request === "onUserAction")
			{
				var actionInfo = 
				{
					"action":{icon:"fa fa-asterisk",color:"#FFFAC6"},
					"affection":{icon:"fa fa-heart",color:"#F66"},
					"frown":{icon:"fa fa-frown-o",color:"#A2AECE"},
					"smile":{icon:"fa fa-smile-o",color:"#FEFFC1"},
					"meh":{icon:"fa fa-meh-o",color:"#CFC4DD"},
					"thumbsup":{icon:"fa fa-thumbs-o-up",color:"#EEE"},
					"thumbsdown":{icon:"fa fa-thumbs-o-down",color:"#EEE"},
					"throwrock":{icon:"fa fa-hand-rock-o",color:"#EEE"},
					"throwpaper":{icon:"fa fa-hand-paper-o",color:"#EEE"},
					"throwscissors":{icon:"fa fa-hand-scissors-o",color:"#EEE"},
					"hashtag":{icon:"fa fa fa-hashtag",color:"#69FB70"},
					"greet":{icon:"fa fa-hand-spock-o",color:"#FEE"},
					"farewell":{icon:"fa fa-hand-peace-o",color:"#EEF"}
				}
				if ( actionInfo[data.type])
				{
					if ( chat.rooms[data.room])
					{
						chat.rooms[data.room].addActionMessage(data.username, data.message, actionInfo[data.type].icon, data.timestamp, actionInfo[data.type].color);
					}
				}
				else if (data.type === "diceroll")
				{
					if ( chat.rooms[data.room])
					{
						chat.rooms[data.room].messages.appendChild(createDiceRollElement(data.rollObject));
						chat.rooms[data.room].lastSender = null;
					}
				}
				else
				{
					chat.addSystemMessage(data.username, data.username + " does something ~mysterious~", "fa fa-question", "#EEE");
				}
				if (data.username != chat.user.name)
				{
					Events.onChatMessage(data.room);
				}
			}
			else if (request === "onGamble")
			{
				chat.addSystemMessage("system", data.message, "fa fa-money" );
			}
			else if (request === "onMOTD")
			{
				chat.addSystemMessage("system", data.message, "fa fa-comment", "#66F", "#FFF"  );
				nyanpals.sound.play("./snd/motd.wav");
			}
			else if (request === "onWhisperSent")
			{
				var room = "pm_"+data.target;
				if ( chat.rooms[room] == null )
				{
					chat.addRoom(room, new PrivateChatRoom("pm_"+data.target,"@"+data.target,data.target), true );
				}
				chat.rooms[room].addChatMessage(data.username + " to " + data.target, data.username, data.message, data.timestamp );
			}
			else if (request === "onWhisperReceived")
			{
				var room = "pm_"+data.username;
				if ( chat.rooms[room] == null )
				{
					chat.addRoom(room, new PrivateChatRoom("pm_"+data.username,"@"+data.username,data.username) );
				}
				if ( room != chat.activeRoom)
				{
					chat.rooms[room].alert();
				}
				chat.rooms[room].addChatMessage(data.username + " to " + data.target, data.username, data.message, data.timestamp );
				Events.onPrivateMessage(room);
			}
			else if (request === "onRequestStreamAccess")
			{
				chat.rooms[chat.activeRoom].messages.appendChild(createStreamAccessMessageElement(data.username).element);
				nyanpals.sound.play("./snd/streamaccessrequest.wav");
			}
			else if (request === "onStreamPublicationInfo")
			{
				Events.onStreamPublicationInfo(data);
			}
			else if (request === "onKeepAlive")
			{
				websocket.keepAliveStrikes = websocket.keepAliveStrikesMax;
			}
			else if (request === "onReceiveStreamInfo")
			{
				if ( !nyanpals.videoPanel.viewing[data.username])
				{
					nyanpals.videoPanel.show();
					nyanpals.videoPanel.addPlayer("rtmp://" + window.location.hostname + data.url, data.username, data.description);
					startWatching(data.username);
					if (data.restriction)
					{
						nyanpals.videoPanel.getPlayer(data.username).showRestriction();
					}
					else
					{
						nyanpals.videoPanel.getPlayer(data.username).hideRestriction();
					}
					//createPopoutStream(chat.user.name, data.username);
				}
			}
			else if (request === "onDenyStreamAccess")
			{
				nyanpals.sound.play("./snd/streamaccessdenied.wav");
				chat.addSystemMessage("system",data.message,"fa fa-close");
				
			}
			else if (request === "onRemovedFromStream")
			{
				stopWatching(data.username);
				nyanpals.sound.play("./snd/streamaccessdenied.wav");
				chat.addSystemMessage("system",data.message,"fa fa-close");
			}
		}
		websocket.onSocketClose = function ()
		{
			if (websocket.connected)
			{
				for ( var k in nyanpals.videoPanel.viewing )
				{
					stopWatching(k);
				}
				websocket.send("onUserLeaveChat",
				{
					"username": chat.user.name
				});
			}
			websocket.connected = false;
		}
		websocket.onSocketError = function ()
		{
			websocket.connected = false;
			chat.addSystemMessage("system", "Error. Connection closed.",  "fa fa-close")
			nyanpals.websocket.attemptReconnect();
		};
		websocket.initialize = function()
		{
			if (window.location.protocol != "https:")
			{
				websocket.host = "ws://" + window.location.host + "/" + window.location.pathname;
			}
			else
			{
				websocket.host = "wss://" + window.location.host + "/" + window.location.pathname;
			}

			if (window.MozWebSocket)
				window.WebSocket = window.MozWebSocket;
			if (!window.WebSocket)
			{
				alert("Your browser doesn't support WebSocket!");
			}
			else
			{
				websocket.socket = new WebSocket(websocket.host);
				websocket.socket.onopen = websocket.onSocketOpen;
				websocket.socket.onmessage = websocket.onSocketMessage;
				websocket.socket.onclose = websocket.onSocketClose;
				websocket.socket.onerror = websocket.onSocketError;
			}
		}
		websocket.send = function (request, obj)
		{
			if ( websocket.socket.readyState == websocket.socket.OPEN)
			{
				websocket.socket.send(JSON.stringify([request, obj]));
			}
		}
		return websocket;
	}

	var Color = {
		componentToHex: function(c)
		{
			var hex = c.toString(16);
			return hex.length == 1 ? "0" + hex : hex;
		},
		rgbToHex: function(r, g, b)
		{
			return (this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b)).toUpperCase();
		},
		rgbToHsv: function( r, g, b )
		{
			var rr = r / 255;
			var gg = g / 255;
			var bb = b / 255;
			var C = Math.max(rr,gg,bb);
			var c = Math.min(rr,gg,bb);
			var d = C-c;
			var h;
			if ( d == 0 )
			{
				h = 0;
			}
			else if ( C == rr )
			{
				h = 60 * (((gg-bb)/d)%6);
			}
			else if ( C == gg )
			{
				h = 60 * (((bb-rr)/d)+2);
			}
			else if ( C == bb )
			{
				h = 60 * (((rr-gg)/d)+4);
			}
			var s = d/C;
			if ( C == 0 )
			{
				s = 0;
			}
			return {
				"h":h,
				"s":s,
				"v":C
			}
		},
		hsvToRgb: function( h, s, v )
		{
			var c = v * s;
			var x = c * (1 - Math.abs((h/60) % 2-1));
			var m = v-c;
			var rr = 0;
		    var gg = 0;
		    var bb = 0;
			if (h < 60 )
			{
				rr = c;
				gg = x;
			}
			else if ( h < 120)
			{
				rr = x;
				gg = c;
			}
			else if ( h < 180)
			{
				gg = c;
				bb = x;
			}
			else if ( h < 240)
			{
				gg = x;
				bb = c;
			}
			else if ( h < 300)
			{
				rr = x;
				bb = c;
			}
			else
			{
				rr = c;
				bb = x;
			}
			return {
				"r":Math.round((rr+m) * 255),
				"g":Math.round((gg+m) * 255),
				"b":Math.round((bb+m) * 255)
			}
		},
		calculateStringColors: function (str)
		{
			var baseValue = 0;
			for (var i = 0; i < str.length; i++)
			{
				baseValue += str.charCodeAt(i) * 0xFFFFFF * i + str.length;
			}
			var bigValue = (baseValue * 0xABCDEF) % 0xDDDDDD;
			var date = new Date();
			var fullYear = date.getUTCFullYear();
			var month = date.getUTCMonth();
			var day = date.getUTCDate();
			var jan1 = new Date( Date.UTC(fullYear, 0, 1) );
			var day = Math.ceil( (new Date( Date.UTC(fullYear, month, day) ) - jan1) / 86400000);
			var h = (bigValue + day* 1024) % 360;
			var s = ((bigValue + day* 1024) % 20) / 100 + .1;
			var v = ((bigValue + day* 1024) % 5) / 100 + .95;
			var rgb = Color.hsvToRgb(h,s,v);
			return rgb;
		}
	}

	var ID = function()
	{
		return {
			generate: function(length)
			{
				length = or(length,16);
				var string = "";
				for (var i = 0; i < length; i++)
				{
					string += Math.round(Math.random() * 16).toString(16);
				}
				return string;
			}
		};
	}

	var User = function(name, status, badges, viewers, streaming, powerLevel, transferred)
	{
		return {
			name: or(name, "User"),
			badges: or(badges,{}),
			status: or(status,""),
			viewers: or(viewers,{}),
			streaming: or(streaming, false),
			powerLevel: or(powerLevel,0),
			transferred: or(transferred,0)
		}
	}

	var ViewList = function()
	{
		var viewList = {};
		viewList.views = {};
		var wrapper = document.getElementById("viewListWrapper");
		var views = document.getElementById("viewListEntries");
		viewList.add = function(name, view)
		{
			viewList.views[name] = view;
		}
		viewList.remove = function(name)
		{
			delete(viewList.views[name]);
			viewList.sort();
		}
		viewList.sort = function()
		{
			var sortQueue = [];
			while ( views.childNodes.length > 0 )
			{
				views.removeChild(views.firstChild);
			}
			for ( k in viewList.views )
			{
				sortQueue.push({entry:viewList.views[k],view:viewList.views[k]});
			}
			sortQueue.sort(function(a,b)
			{
				if (a.view.name.toLowerCase() < b.view.name.toLowerCase()) return -1;
				if (a.view.name.toLowerCase() > b.view.name.toLowerCase()) return 1;
				return 0
			});
			for ( var i = 0; i < sortQueue.length; i++ )
			{
				views.appendChild(sortQueue[i].entry.wrapper);
			}
		}
		viewList.update = function(name)
		{
			if ( viewList.views[name] )
			{
				viewList.views[name].update();
			}
			else
			{
				viewList.add(name);
				viewList.views[name].update();
			}
		}
		viewList.clear = function()
		{
			viewList.wrapper
		}
		viewList.update
		return viewList;
	}

	var RoomView = function(name,alias)
	{
		var view = {};
		view.name = name;
		view.alias = alias;
		var colors = Color.calculateStringColors(view.name);

		view.activate = function()
		{
			chat.showRoom(view.name);
			view.check();
		}

		var wrapper = document.createElement("div");
		wrapper.className = "viewListEntryWrapper";
		wrapper.style.backgroundColor = "rgb(" + colors.r + "," + colors.g + "," + colors.b + ")";

		var element = document.createElement("div");
		element.className = "viewListEntry";
		element.className += " channel_" + name;

		var activationAnchor = document.createElement("a");
		activationAnchor.href = "#";

		activationAnchor.onclick = function()
		{
			view.activate();
		}

		var nameSpan = document.createElement("span");
		nameSpan.className = "viewListEntryName";
		nameSpan.appendChild(document.createTextNode(alias));

		var closeAnchor = document.createElement("a");
		closeAnchor.className = "viewListEntryClose";
		closeAnchor.appendChild(document.createTextNode("leave"));

		closeAnchor.onclick = function()
		{
			nyanpals.websocket.send("onUserLeaveRoom",
			{
				room: view.name
			});
		}

		activationAnchor.appendChild(nameSpan);
		element.appendChild(activationAnchor);
		element.appendChild(closeAnchor);
		wrapper.appendChild(element);

		view.closeAnchor = closeAnchor;
		view.entry = element;
		view.wrapper = wrapper;
		view.alert = function()
		{
			activationAnchor.className = "viewAlert";
		}
		view.check = function()
		{
			activationAnchor.className = "";
		}
		return view;
	}

	var PMView = function(name,alias)
	{
		var view = new RoomView(name,alias);
		view.entry.className = "viewListEntry";
		view.entry.className += " sender_" + name.substr(3);
		var colors = Color.calculateStringColors(name.substr(3));
		view.wrapper.style.backgroundColor = "rgb(" + colors.r + "," + colors.g + "," + colors.b + ")";
		view.closeAnchor.onclick = function()
		{
			chat.removeRoom(name);
		}
		return view;
	}

	var UserList = function()
	{
		var userList = {};
		userList.entries = {};
		var wrapper = document.getElementById("userListWrapper");
		var users = document.getElementById("userListUsers");
		userList.add = function(username)
		{
			userList.entries[username] = new UserListEntry(username, userList);
		}
		userList.update = function(username)
		{
			if ( userList.entries[username])
			{
				userList.entries[username].update(username);
			}
			else
			{
				userList.add(username);
				userList.entries[username].update(username);
			}
		}
		userList.sort = function()
		{
			var sortQueue = [];
			while ( users.childNodes.length > 0 )
			{
				users.removeChild(users.firstChild);
			}
			for ( k in userList.entries )
			{
				sortQueue.push({entry:userList.entries[k],user:chat.users[userList.entries[k].username]});
			}
			sortQueue.sort(function(a,b)
			{
				if (a.user.powerLevel > b.user.powerLevel) return -1;
				if (a.user.powerLevel < b.user.powerLevel) return 1;
				if (a.user.streaming > b.user.streaming) return -1;
				if (a.user.streaming < b.user.streaming) return 1;
				if (a.user.name.toLowerCase() < b.user.name.toLowerCase()) return -1;
				if (a.user.name.toLowerCase() > b.user.name.toLowerCase()) return 1;
				return 0
			});
			for ( var i = 0; i < sortQueue.length; i++ )
			{
				users.appendChild(sortQueue[i].entry.wrapper);
			}
		}
		userList.remove = function(username)
		{
			if ( userList.entries[username] && userList.entries[username].wrapper.parentNode == users )
			{
				users.removeChild(userList.entries[username].wrapper);
				delete(userList.entries[username]);
			}
		}
		userList.clear = function()
		{
			while ( users.childNodes.length > 0 )
			{
				users.removeChild(users.firstChild);
			}
			delete(userList.entries);
			userList.entries = {};
		}
		return userList;
	}

	var UserListEntry = function(username, userList)
	{

		var listEntry = {};
		listEntry.username = username;
		listEntry.userList = userList;

		var wrapper = document.createElement("table");
		wrapper.className = "userListEntryWrapper";

		var element = document.createElement("tr");
		element.className = "userListEntry";
		element.className += " userList_" + username;

		var cell = document.createElement("td");
		cell.style.width = "100%";

		var usernameElement = document.createElement("span");
		usernameElement.className = "userListEntryUsername";
		usernameElement.className += " user_" + username;
		
		usernameElement.appendChild(document.createTextNode(""));

		var usernameNoteElement = document.createElement("span");
		usernameNoteElement.className = "userListEntryUsernameNote";
		usernameNoteElement.appendChild(document.createTextNode(""));

		var statusWrapper = document.createElement("div");
		statusWrapper.className = "userStatusWrapper";

		var statusElement = document.createElement("span");
		statusElement.className = "userListEntryStatus";
		statusElement.appendChild(document.createTextNode(""));

		statusWrapper.appendChild(statusElement);

		var badgesWrapper = document.createElement("div");
		badgesWrapper.className = "userBadgesWrapper";

		var viewer = document.createElement("td");
		viewer.className = "userListViewer";
		viewer.style.display = "none";
		viewer.title = "Remove Viewer";

		var viewerIcon = document.createElement("i");
		viewerIcon.className = "fa fa-eye";
		viewer.appendChild(viewerIcon);

		viewer.onmouseenter = function(event)
		{
			viewerIcon.className = "fa fa-eye-slash";
		}

		viewer.onmouseleave = function(event)
		{
			viewerIcon.className = "fa fa-eye";
		}

		viewer.onclick = function(event)
		{
			nyanpals.websocket.send("onRemoveStreamViewer",{username:username});
			event.stopPropagation();
		}

		var publisher = document.createElement("td");
		publisher.className = "userListPublisher";
		publisher.style.display = "none";

		var publisherIcon = document.createElement("i");
		publisherIcon.className = "fa fa-video-camera";
		publisher.appendChild(publisherIcon);

		publisher.onclick = function(event)
		{
			if (!nyanpals.videoPanel.viewing[username])
			{
				nyanpals.websocket.send("onRequestStreamInfo",
				{
					"username": username
				});
			}
			else
			{
				stopWatching(username);
			}
		}

		element.appendChild(publisher);
		cell.appendChild(usernameElement);
		cell.appendChild(usernameNoteElement);
		cell.appendChild(statusWrapper);
		cell.appendChild(badgesWrapper);
		element.appendChild(cell);
		element.appendChild(viewer);

		wrapper.statusElement = statusElement;
		wrapper.badgesElement = badgesWrapper;
		wrapper.appendChild(element);

		wrapper.publisher = publisher;
		wrapper.viewer = viewer;

		listEntry.wrapper = wrapper;
		listEntry.update = function(username)
		{
			var user = chat.users[username];
			var colors = Color.calculateStringColors(user.name);
			wrapper.style.backgroundColor = "rgb(" + colors.r + "," + colors.g + "," + colors.b + ")";
			usernameElement.childNodes[0].nodeValue = user.name;
			if ( preferences.get("showBandwidthUsage") && user.transferred > 0 )
			{
				usernameNoteElement.childNodes[0].nodeValue = "(" + Math.floor(user.transferred / 1048576 * 100) / 100 + "MB)";
			}
			else
			{
				usernameNoteElement.childNodes[0].nodeValue = "";
			}
			statusElement.childNodes[0].nodeValue = user.status;
			while ( badgesWrapper.childNodes.length > 0)
			{
				badgesWrapper.removeChild(badgesWrapper.firstChild);
			}
			for ( var k in user.badges )
			{
				badgesWrapper.appendChild(new Badge(user.badges[k].icon, user.badges[k].title).element);
			}
			if (user.name == chat.user.name )
			{
				if ( user.viewers )
				{
					for ( k in user.viewers)
					{
						if ( chat.users[k] && listEntry.userList.entries[k] )
						{
							listEntry.userList.entries[k].showViewer();
						}
					}
				}
			}
			if ( user.streaming )
			{
				listEntry.userList.entries[user.name].showPublisher();
			}
			else
			{
				listEntry.userList.entries[user.name].hidePublisher();
			}
		}

		listEntry.rename = function(username)
		{
			usernameElement.childNodes[0].nodeValue = username;
		}

		listEntry.showPublisher = function()
		{
			publisher.style.display = "table-cell";
		}

		listEntry.hidePublisher = function()
		{
			publisher.style.display = "none";
		}

		listEntry.showViewer = function()
		{
			viewer.style.display = "table-cell";
		}

		listEntry.hideViewer = function()
		{
			viewer.style.display = "none";
		}

		return listEntry;
	}

	var Badge = function(className, title)
	{
		var badge = {};
		badge.className = or(className,"fa fa-question");
		badge.title = title;
		badge.element = document.createElement("div");
		badge.element.className = "userBadge " + badge.className;
		badge.element.title = badge.title;
		return badge;
	}

	var Login = function()
	{
		var login = {};
		login.element = document.getElementById("login");
		login.txtUsername = document.getElementById("txtUsername");
		login.txtPassword = document.getElementById("txtPassword");
		login.txtRoom = document.getElementById("txtRoom");
		login.txtConfirmPassword = document.getElementById("txtConfirmPassword");
		login.btnConnect = document.getElementById("btnConnect");
		login.lblError = document.getElementById("loginError");
		login.getUsername = function()
		{
			return login.txtUsername.value.trim();
		}
		login.getPassword = function()
		{
			return login.txtPassword.value;
		}
		login.getRoom = function()
		{
			return login.txtRoom.value;
		}
		login.confirmPassword = function()
		{
			return login.txtPassword.value === login.txtConfirmPassword.value;
		}
		login.hide = function()
		{
			login.element.style.display = "none";
		}
		login.show = function()
		{
			login.element.style.display = "block";
		}
		login.setError = function(message)
		{
			login.lblError.childNodes[0].nodeValue = message;
		}
		login.btnConnect.onclick = function()
		{
			try
			{
				if (nyanpals.websocket.connected == false)
				{
					nyanpals.websocket.initialize();
				}
			}
			catch( ex)
			{

			}
			attemptAuthenticate();
		}
		login.txtUsername.oninput = function(event)
		{
			login.refreshColor();
		}
		login.txtUsername.onkeydown = function(event)
		{
			if ( event.which == 13)
			{
				attemptAuthenticate();
			}
		}
		login.txtPassword.onkeydown = function(event)
		{
			if ( event.which == 13)
			{
				attemptAuthenticate();
			}
		}
		login.txtConfirmPassword.onkeydown = function(event)
		{
			if ( event.which == 13)
			{
				attemptAuthenticate();
			}
		}
		login.refreshColor = function()
		{
			var colors = Color.calculateStringColors(login.txtUsername.value.trim());
			login.txtUsername.style.backgroundColor = "rgb("+ colors.r + "," + colors.g +"," + colors.b +")";
			login.txtUsername.className = "form-control";
			
			colors = Color.calculateStringColors(login.txtRoom.value.trim());
			login.txtRoom.style.backgroundColor = "rgb("+ colors.r + "," + colors.g +"," + colors.b +")";
			login.txtRoom.className = "form-control";
			login.txtUsername.className += " sender_" +login.txtUsername.value.trim();
			login.txtRoom.className += " channel_" +login.txtRoom.value.trim();
		}
		return login;
	}

	var Chat = function()
	{
		return {
			container: document.getElementById("chatContainer"),
			user: new User("User"),
			users: {},
			rooms: {},
			parsers: [],
			activeRoom: null,
			input: new ChatInput(document.getElementById("chatInput")),
			login: new Login(),
			reconnecting: false,
			idleStrikesMax: 421,
			idleStrikes: this.idleStrikesMax,
			viewList: new ViewList(),
			activeView: null,
			addRoom: function(name, room, show)
			{
				this.rooms[name] = room;
				this.container.tBodies[0].childNodes[0].childNodes[0].appendChild(this.rooms[name].wrapper);
				if ( this.activeRoom == null){
					this.activeRoom = name;
				}
				chat.viewList.add("room_" + name, room.view);
				chat.viewList.sort();
				if ( show )
				{
					this.showRoom(name);
				}
				else
				{
					this.hideRoom(name);
					room.alert();
				}
			},
			removeRoom: function(name)
			{
				this.viewList.remove("room_" + name);
				this.container.tBodies[0].removeChild(this.rooms[name].wrapper);
				if ( this.activeRoom == name)
				{
					this.rooms[name].userList.clear();
				}
				delete(this.rooms[name]);
				this.activeRoom = null;
				for ( var k in this.rooms )
				{
					this.showRoom(k);
					break;
				}
			},
			showRoom: function(name)
			{
				for ( var k in this.rooms )
				{
					this.hideRoom(k);
				}
				if ( this.rooms[name] )
				{
					this.rooms[name].show();
				}
			},
			hideRoom: function(name)
			{
				if ( this.rooms[name] )
				{
					this.rooms[name].hide();
				}
			},
			addSystemMessage: function(sender, message, icon, backgroundColor, color)
			{
				if ( this.rooms[this.activeRoom])
				{
					this.rooms[this.activeRoom].addSystemMessage(sender, message, icon, backgroundColor, color);
				}
			},
			updateUser: function(username, data, room)
			{
				if ( data )
				{
					this.users[username] = new User(data.username, data.status, data.badges, data.viewers, data.streaming, data.powerLevel, data.transferred);
					if ( room && this.rooms[room] )
					{
						this.rooms[room].updateUser(username);
					}
				}
				else
				{
					if ( room && this.rooms[room])
					{
						this.rooms[room].userList.remove(username);
					}
				}
			},
			clearUserLists: function()
			{
				for ( var k in this.rooms )
				{
					this.rooms[k].userList.clear();
				}
			}
		}
	}

	var ChatRoom = function(name, alias)
	{
		var chatRoom = {
			name: name,
			alias: alias,
			view: new RoomView(name, alias),
			userList: new UserList(),
			wrapper: (function(){
				var element = document.createElement("div");
				element.className = "chatRoom";
				makeElementAutoScrolling(element);
				return element;
			})(),
			alert: function()
			{
				this.view.alert();
			},
			sendMessage: function(message)
			{
				nyanpals.websocket.send("onSendChatMessage",
				{
					"message": message,
					"timestamp": getTimestamp(),
					"room": chat.activeRoom
				});
			},
			scrollToBottom: function()
			{
				this.wrapper.scrollTop = this.wrapper.scrollHeight - this.wrapper.clientHeight;
			},
			updateUser: function(username)
			{
				var shouldSort = false;
				var user = chat.users[username];
				if ( user != null )
				{
					if (this.userList.entries[username])
					{
						this.userList.entries[username].update(username);
					}
					else
					{
						this.userList.add(username);
						this.userList.entries[username].update(username);
						shouldSort = true;
					}
				}
				else
				{
					if (this.userList.entries[username])
					{
						this.userList.remove(username);
						shouldSort = true;
					}
				}
				if ( shouldSort && chat.activeRoom == this.name )
				{
					this.userList.sort();
				}
			},
			refreshUserList: function(sort)
			{
				for ( var k in this.userList.entries)
				{
					this.updateUser(k);
				}
				if ( sort && chat.activeRoom == this.name )
				{
					this.userList.sort();
				}
			},
			addMessage: function(chatMessage, separate)
			{
				if ( chatMessage.sender != this.lastSender || separate )
				{
					this.wrapper.appendChild(chatMessage.element);
					this.lastMessage = chatMessage;
					this.lastSender = chatMessage.sender;
				}
				else if ( this.lastMessage != null)
				{
					this.lastMessage.update(chatMessage.sender, chatMessage.tag, chatMessage.messageElement, chatMessage.localTimestamp);
				}
			},
			addChatMessage: function(sender, tag, message, localTimestamp)
			{
				var element = document.createElement("div");
				element.appendChild(document.createTextNode(message));
				for (var i = 0; i < chat.parsers.length; i++)
				{
					chat.parsers[i].parse(sender,element,this);
				}
				this.addMessage(new ChatMessage(sender,tag,element,localTimestamp))
			},
			addActionMessage: function(sender, message, icon, localTimestamp, backgroundColor)
			{
				var element = document.createElement("div");
				var iconElement = document.createElement("i");
				iconElement.className = icon;
				element.appendChild(iconElement);
				element.appendChild(document.createTextNode(message));
				this.addMessage(new ChatMessage(sender,null,element,localTimestamp,or(backgroundColor,"#FF6")), true);
				this.lastSender = null;
			},
			addSystemMessage: function(sender, message, icon, backgroundColor, color)
			{
				var element = document.createElement("div");
				var iconElement = document.createElement("i");
				iconElement.className = icon;
				element.appendChild(iconElement);
				element.appendChild(document.createTextNode(message));
				this.addMessage(new ChatMessage(sender,null,element,null,or(backgroundColor,"#FF6"), color), true);
				this.lastSender = null;
			},
			show: function()
			{
				this.wrapper.style.display = "initial";

				document.getElementById("userListHeader").childNodes[0].nodeValue = this.alias;
				document.getElementById("userListHeader").className = "channel_" + this.name;
				var colors = Color.calculateStringColors(this.name);
				document.getElementById("userListHeader").style.backgroundColor = "rgb(" + (colors.r) + "," + (colors.g) + "," + (colors.b) +")";
				chat.activeRoom = this.name;
				this.refreshUserList(true);
				this.scrollToBottom();
				this.view.check();
			},
			hide: function()
			{
				this.wrapper.style.display = "none";
			},
			lastMessage: null,
			lastSender: null
		}
		return chatRoom;
	}

	var PrivateChatRoom = function(name,alias,username)
	{
		var chatRoom = new ChatRoom(name,alias);
		chatRoom.view = new PMView(name, alias);
		chatRoom.username = username;
		chatRoom.sendMessage = function(message)
		{
			if ( message.trim().substr(0) == "/" )
			{
				nyanpals.websocket.send("onSendChatMessage",
				{
					"message": message.trim(),
					"timestamp": getTimestamp(),
					"room": chat.activeRoom
				});
			}
			else
			{
				nyanpals.websocket.send("onWhisperUser",
				{
					"username": username,
					"message": message,
					"timestamp": getTimestamp()
				});
			}
		}
		chatRoom.show = function()
		{
			chatRoom.wrapper.style.display = "table-cell";

			document.getElementById("userListHeader").childNodes[0].nodeValue = chatRoom.alias;
			document.getElementById("userListHeader").className = "sender_" + chatRoom.username;
			var colors = Color.calculateStringColors(chatRoom.username);
			document.getElementById("userListHeader").style.backgroundColor = "rgb(" + (colors.r) + "," + (colors.g) + "," + (colors.b) +")";
			chat.activeRoom = chatRoom.name;
			chatRoom.refreshUserList(true);
			chatRoom.scrollToBottom();
			chatRoom.view.check();
		}
		return chatRoom;
	}

	var ChatMessage = function(sender, tag, messageElement, localTimestamp, backgroundColor, color)
	{
		var colors;
		if ( tag && tag.length > 0 && !backgroundColor )
		{
			colors = Color.calculateStringColors(tag);
		}

		var chatMessage = {};
		chatMessage.sender = sender;
		chatMessage.tag = tag;
		chatMessage.messageElement = messageElement;
		chatMessage.localTimestamp = localTimestamp;

		var chatMessageContainer = document.createElement("div")
		chatMessageContainer.className = "chatMessageContainer";

		var chatSender = document.createElement("div");
		chatSender.className = "chatSender";
		chatSender.className += " sender_" + sender;
		chatMessageContainer.appendChild(chatSender);

		var chatMessages = document.createElement("div");
		chatMessages.className = "chatMessages message_" + sender;
		chatMessageContainer.appendChild(chatMessages);

		if ( backgroundColor )
		{
			chatMessageContainer.style.backgroundColor = backgroundColor;
		}
		else if ( colors )
		{
			chatMessageContainer.style.backgroundColor = "rgb(" + (colors.r + 24) + "," + (colors.g + 24) + "," + (colors.b + 24) + ")";
			chatSender.style.backgroundColor = "rgb(" + colors.r + "," + colors.g + "," + colors.b + ")";
		}

		if (color)
		{
			chatMessageContainer.style.color = color;
		}

		var getTimestamp = function ()
		{
			var date = new Date();
			var hours = String(date.getHours());
			if (hours.length == 1)
			{
				hours = "0" + hours;
			}
			var minutes = String(date.getMinutes());
			if (minutes.length == 1)
			{
				minutes = "0" + minutes;
			}

			return hours + ":" + minutes;
		}

		chatMessage.setTag = function(tag)
		{
			if ( tag && tag.length > 0)
			{
				if ( chatSender.childNodes.length == 0)
				{
					var outerSpan = document.createElement("span");
					outerSpan.className = "sender positionSticky";
					outerSpan.className += " user_" + tag;
					outerSpan.appendChild(document.createTextNode(tag));
					chatSender.appendChild(outerSpan);
				}
				else
				{
					chatSender.childNodes[0].nodeValue = tag;
				}
			}
			else
			{
				if ( chatSender.childNodes.length > 0)
				{
					while ( chatSender.childNodes.length > 0)
					{
						chatSender.removeChild(chatSender.firstChild);
					}
				}
				chatSender.style.display = "none";
			}
		}

		chatMessage.appendMessage = function(sender, tag, messageElement,localTimestamp)
		{
			var message = document.createElement("div");
			message.className = "chatMessage";
			if ( !tag || tag.length == 0 )
			{
				message.className = "systemMessage";
			}

			var timestampWrapper = document.createElement("div");
			timestampWrapper.className = "chatMessageTimestampWrapper";

			var timestamp = document.createElement("span");
			timestamp.className = "chatMessageTimestamp";
			var timestampText = sender + "@" + getTimestamp();
			if (localTimestamp)
			{
				timestampText += " (" + localTimestamp + ")";
			}
			timestamp.appendChild(document.createTextNode(timestampText));

			var chatMessageSpan = document.createElement("span");

			chatMessageSpan.appendChild(messageElement);

			timestampWrapper.appendChild(timestamp);
			message.appendChild(timestampWrapper);
			message.appendChild(chatMessageSpan);

			chatMessages.appendChild(message);
		}

		chatMessage.update = function(sender, tag, messageElement, localTimestamp)
		{
			chatMessage.setTag(tag);
			chatMessage.appendMessage(sender, tag, messageElement,localTimestamp);
		}

		chatMessage.update(sender,tag,messageElement,localTimestamp);

		chatMessage.element = chatMessageContainer;
		return chatMessage;
	}

	var ChatInput = function(element)
	{
		var chatInput = {};
		chatInput.element = element;
		chatInput.focus = function()
		{
			chatInput.element.focus();
		}
		chatInput.element.onkeydown = function (event)
		{
			var message = chatInput.element.value;
			if (event.which == 13)
			{
				if (event.shiftKey)
				{
					chatInput.element.value = chatInput.element.value + "\n";
					event.useCapture = true;
					event.preventDefault();
					event.stopPropagation();
					return false;
				}
				else
				{
					nyanpals.inputHistory.add(message);
					if ( message === "/clear")
					{
						while (chat.rooms[chat.activeRoom].messages.childNodes.length > 0)
						{
							chat.rooms[chat.activeRoom].messages.removeChild(chat.rooms[chat.activeRoom].messages.firstChild);
						}
						chat.rooms[chat.activeRoom].addSystemMessage("system","chat has been cleared","fa fa-asterisk");
					}
					else if (message.trim().length > 0)
					{
						//chat.addChatMessage(username, chat.inputElement.value);
						if ( chat.activeRoom && chat.rooms[chat.activeRoom] )
						{
							chat.rooms[chat.activeRoom].sendMessage(message);
						}
						else
						{
							nyanpals.websocket.send("onSendChatMessage",
							{
								"message": message,
								"timestamp": getTimestamp()
							});
						}
					}
					Events.onChatInput(message);
					chatInput.element.value = "";
					event.preventDefault();
				}
			}
			else if (event.which == 9)
			{
				var names = [];
				for ( var k in chat.users )
				{
					names.push( k);
				}
				var str = message;
				var sub = getWordIndexUnderCaret(chatInput.element);
				var search = str.substr(sub.start,sub.end);
				var outcome = "";
				outcome = str.substr(0,sub.start);
				outcome += getBestGuessString(search, names);
				outcome += str.substr(sub.end);
				chatInput.element.value = outcome;
				event.preventDefault();
			}
			else if (event.which == 38)
			{
				if ( nyanpals.inputHistory.isFront() )
				{
					nyanpals.inputHistory.add(chatInput.element.value);
					chatInput.element.value = nyanpals.inputHistory.previous();
				}
				chatInput.element.value = nyanpals.inputHistory.previous();
			}
			else if (event.which == 40)
			{
				chatInput.element.value = nyanpals.inputHistory.next();
			}
		}

		return chatInput;
	}

	var VideoPanel = function()
	{
		var videoPanel = {};

		videoPanel.cell = document.getElementById("videosCell");
		videoPanel.element = document.getElementById("videos");
		videoPanel.viewing = {};
		videoPanel.players = {};
		videoPanel.linking = {};
		videoPanel.playerCount = 0;

		videoPanel.show = function()
		{
			videoPanel.cell.style.display = "table-row";
			if ( chat.activeRoom && chat.rooms[chat.activeRoom])
			{
				chat.rooms[chat.activeRoom].scrollToBottom();
			}
		}

		videoPanel.hide = function()
		{
			videoPanel.cell.style.display = "none";
			if ( chat.activeRoom && chat.rooms[chat.activeRoom])
			{
				chat.rooms[chat.activeRoom].scrollToBottom();
			}
		}

		videoPanel.removePlayer = function (id, username)
		{
			if ( document.getElementById(id) )
			{
				$f(id).unload();
				videoPanel.element.removeChild(document.getElementById(id).parentNode);
				videoPanel.playerCount--;
				videoPanel.resizePlayers();
				stopWatching(username);
				if ( videoPanel.playerCount == 0)
				{
					videoPanel.cell.style.display = "none";
				}
				delete(videoPanel.players[id])
			}
		}

		videoPanel.getPlayer = function(username)
		{
			return videoPanel.players[videoPanel.linking[username]];
		}

		videoPanel.addPlayer = function (target,username,description)
		{
			videoPanel.cell.style.display = "table-row";
			var id = nyanpals.id.generate();
			var player = videoPanel.createPlayer(id,target,username,description);
			videoPanel.element.appendChild(player);
			videoPanel.initializePlayer(id, target);
			videoPanel.players[id] = player;
			videoPanel.playerCount++;
			videoPanel.resizePlayers();
			videoPanel.linking[username] = id;
		}

		videoPanel.resizePlayers = function()
		{
			for (var k in videoPanel.players)
			{
				videoPanel.players[k].style.width =  (100/videoPanel.playerCount)+"%";
			}
		}

		videoPanel.createPlayer = function (id, target, username, description)
		{
			var wrapper = document.createElement("td");
			wrapper.className = "videoWrapper";
			var element = document.createElement("div");
			element.id = id;
			element.className = "videoPlayer";

			var controls = document.createElement("div");
			controls.className = "videoControls";

			var closeButton = document.createElement("i");
			closeButton.className = "fa fa-close videoControlsButton";
			closeButton.onclick = function()
			{
				stopWatching(username);
			}

			var drag = document.createElement("div");
			drag.className = "dragVertical";
			drag.resizing = false;

			drag.addEventListener('mousedown', function (event)
			{
				drag.resizing = true;
			});

			document.addEventListener('mousemove', function (event)
			{
				var container = $("#videos");
				var resizeTarget = wrapper;
				// we don't want to do anything if we aren't resizing.
				if (!drag.resizing)
					return;

				var offsetRight = container.width() - (container.width() - (event.clientX - container.offset().left) + $(resizeTarget).offset().left);
				var offsetPercent = ((event.clientX-$(resizeTarget).offset().left)/container.width()) * 100;
				//var offsetBottom = container.height() - (container.height() - (event.clientY - container.offset().top));

				//resizeTarget.style.height = offsetBottom+"px";
				//resizeTarget.style.width = offsetRight+"px";
				resizeTarget.style.width = offsetPercent+"%";
			});
			document.addEventListener('mouseup', function (event)
			{
				// stop resizing
				drag.resizing = false;
			});

			controls.appendChild(drag);


			var restrictionOverlayWrapper = document.createElement("div");
			restrictionOverlayWrapper.className = "streamRestrictionWrapper";
			restrictionOverlayWrapper.style.display = "none";

			var restrictionOverlay = document.createElement("div");
			restrictionOverlay.className = "streamRestriction transformCenter positionRelative";

			var restrictionIcon = document.createElement("i");
			restrictionIcon.className = "fa fa-ban";

			var restrictionNote = document.createElement("span");
			restrictionNote.className = "streamRestrictionNote";
			restrictionNote.appendChild(document.createTextNode("This stream has been marked NSFW!"));

			var restrictionStay = document.createElement("a");
			restrictionStay.href = "#";
			restrictionStay.appendChild(document.createTextNode("Show me the goods!"));
			restrictionStay.onclick = function()
			{
				restrictionOverlayWrapper.style.display = "none";
			}

			var restrictionLeave = document.createElement("a");
			restrictionLeave.href = "#";
			restrictionLeave.appendChild(document.createTextNode("Get me out of here!"));
			restrictionLeave.onclick = function()
			{
				stopWatching(username);
			}

			wrapper.showRestriction = function()
			{
				restrictionOverlayWrapper.style.display = "block";
			}

			wrapper.hideRestriction = function()
			{
				restrictionOverlayWrapper.style.display = "none";
			}

			restrictionOverlay.appendChild(restrictionIcon);
			restrictionOverlay.appendChild(restrictionNote);
			restrictionOverlay.appendChild(restrictionStay);
			restrictionOverlay.appendChild(restrictionLeave);
			restrictionOverlayWrapper.appendChild(restrictionOverlay);
			wrapper.appendChild(restrictionOverlayWrapper);
			controls.appendChild(closeButton);
			wrapper.appendChild(element);
			wrapper.appendChild(controls);

			return wrapper;
		}

		videoPanel.initializePlayer = function(id, target)
		{
			$f(id, "./flowplayer/flowplayer-3.2.18.swf",{
		  		flashfit: true,
		  		live: true,
		  		wmode:"transparent",
		  		rtmpt: false,
		      	plugins: {
		      		rtmp:{
		      			url:"./flowplayer/flowplayer.rtmp-3.2.13.swf"
		      		},
		      		controls:
			      	{
			      		url: "./flowplayer/flowplayer.controls-3.2.16.swf",
			      		backgroundColor: "transparent",
			      		backgroundGradient: "none",
			      		sliderColor: '#666666',
			            sliderBorder: 'none',
			            volumeSliderColor: '#666666',
			            volumeBorder: 'none',
			 
			            timeColor: '#FFFFFF',
			            durationColor: '#666666',
			 
			            tooltipColor: 'rgba(255, 255, 255, 0.7)',
			            tooltipTextColor: '#000000',
			            scrubber: false
			      	}
				},
				canvas: {
		            backgroundColor: '#000',
		            backgroundGradient: [0, 0]
		      	},
		      	clip:
		      	{
		      		bufferLength: 3,
		      		provider: "rtmp",
		      		autoPlay: true,
		      		scaling: "fit",
					live: true,
		      		url:target
		      	}
		      });
		}

		return videoPanel;
	}

	var PreferenceCollection = function ()
	{
		var collection = {};
		collection.items = {};
		collection.add = function (key, initial, item)
		{
			var preference = new Preference(key, initial, item);
			collection.items[key] = preference;
		}
		collection.set = function (key, preference)
		{
			collection.items[key] = preference;
		}
		collection.remove = function (key)
		{
			delete(collection.items[key]);
		}
		collection.clear = function ()
		{
			for (var k in collection.items)
			{
				delete(collection.items[k]);
			}
		}
		collection.initialize = function ()
		{
			for (var k in collection.items)
			{
				collection.items[k].initialize();
			}
		}
		collection.get = function (key)
		{
			var item = null;
			if (collection.items[key])
			{
				item = collection.items[key].item;
			}
			return item;
		}
		collection.getPreference = function (key)
		{
			return collection.items[key];
		}
		collection.save = function ()
		{
			for (k in collection.items)
			{
				collection.items[k].save();
			}
		}
		collection.load = function ()
		{
			for (k in collection.items)
			{
				collection.items[k].load();
			}
		}
		collection.export = function()
		{
			var data = {};
			for (k in collection.items)
			{
				data[k] = {"item":collection.items[k].item, "initial":collection.items[k].initial};
			}
			return btoa(JSON.stringify(data));
		}
		collection.import = function(data)
		{
			var collectionBackup = collection.items;
			try 
			{
				var data = JSON.parse(atob(data));
				for (k in data)
				{
					collection.add(k, data[k].initial, data[k].item);
				}
				collection.save();
			}
			catch ( ex )
			{
				console.log("import fail: ",ex.message);
				collection.items = collectionBackup;
			}
		}
		return collection;
	}

	var Preference = function (key, initial, item)
	{
		var preference = {};
		preference.key = key;
		preference.initial = initial;
		preference.item = or(item, preference.initial);
		preference.set = function (value)
		{
			preference.item = value;
		}
		preference.save = function ()
		{
			localStorage.setItem(preference.key, JSON.stringify(preference.item));
		}
		preference.load = function ()
		{
			if (localStorage.getItem(preference.key))
			{
				try
				{
					preference.item = JSON.parse(localStorage.getItem(preference.key));
				}
				catch (ex)
				{
					preference.item = preference.initial;
					console.log("failed to load ", preference.key, ex.message)
				}
			}
		}
		preference.initialize = function ()
		{
			preferences.add(preference.key, preference.initial);
		}
		return preference;
	}

	var EmoticonCollection = function ()
	{
		var collection = {};
		collection.items = {};
		collection.list = {};

		collection.add = function (url, key, tag, title, uses)
		{
			var emoticon = new Emoticon(url, key, tag, title, uses);
			collection.items[key] = emoticon;
		}

		collection.remove = function (key)
		{
			delete(collection.emoticons[key]);
		}
		collection.get = function (key)
		{
			return collection.items[key];
		}

		collection.clear = function ()
		{
			for (var k in collection.items)
			{
				delete(collection.items[k]);
			}
		}

		collection.reload = function ()
		{
			collection.clear();
			for (k in collection.list)
			{
				collection.loadList(k);
			}
		}

		collection.refresh = function ()
		{
			var sortedEmoticons = [];
			for (k in collection.items)
			{
				sortedEmoticons.push(collection.items[k]);
			}
			if (preferences.get("emoticonInfo").sortingIndex == 1)
			{
				sortedEmoticons.sort(function (a, b)
				{
					var left = a.uses;
					var right = b.uses;
					if (left == null) left = 0;
					if (right == null) right = 0;
					if (left > right) return -1;
					if (left < right) return 1;
					return 0;
				});
			}
			else if (preferences.get("emoticonInfo").sortingIndex == 2)
			{
				sortedEmoticons.sort(function (a, b)
				{
					if (a.tag < b.tag) return -1;
					if (a.tag > b.tag) return 1;
					return 0;
				});
			}
			else if (preferences.get("emoticonInfo").sortingIndex == 3)
			{
				sortedEmoticons.sort(function (a, b)
				{
					var left = a.uses;
					var right = b.uses;
					if (left == null) left = 0;
					if (right == null) right = 0;
					if (left > right) return -1;
					if (left < right) return 1;
					if (a.tag < b.tag) return -1;
					if (a.tag > b.tag) return 1;
					return 0;
				});
			}
			var sequentialEmoticonAdd = function(list,amount,index)
			{
				index = or(index,0);
				for ( var i = index; i < Math.min(list.length,index+amount); i++)
				{
					emoticonManager.add(list[i]);
				}
				if ( index < list.length )
				{
					setTimeout(function(){ sequentialEmoticonAdd(list,amount,index+amount); },100);
				}
			}
			sequentialEmoticonAdd(sortedEmoticons, 10);
		}

		collection.loadList = function (url)
		{
			collection.list[url] = true;
			$.get(url, null, function (data)
			{
				var emoticons = data;
				for (k in emoticons)
				{
					var emoticon = emoticons[k];
					emoticon.uses = 0;
					if (preferences.get("emoticonInfo").uses) {
						emoticon.uses = or(preferences.get("emoticonInfo").uses[emoticon.key], 0);
					}
					collection.add(emoticon.url, emoticon.key, emoticon.tag, emoticon.uses);
				}
				collection.refresh();
			});
		}
		return collection;
	}

	var Emoticon = function (url, key, tag, uses)
	{
		var emoticon = {
			"url": url,
			"key": key,
			"tag": tag,
			"uses": or(uses, 0)
		}
		return emoticon;
	}

	var TabPage = function ()
	{
		var page = {};
		page.element = document.createElement("div");
		page.element.className = "tabPage";
		page.entries = {};

		var EmoticonEntry = function (emoticon)
		{
			var entry = {};
			entry.selected = false;
			entry.key = emoticon.key;

			var element = document.createElement("div");
			element.className = "emoticonEntry";
			element.style.width = thumbnailSizes[preferences.get("emoticonInfo").thumbnailIndex];
			element.style.height = thumbnailSizes[preferences.get("emoticonInfo").thumbnailIndex];

			var controls = document.createElement("div");
			controls.className = "emoticonControls";

			var favoriteButton = document.createElement("div");
			favoriteButton.className = "emoticonControlsButton";

			favoriteButton.appendChild(new FontIcon("fa fa-star", "S").element);

			var toggleButton = document.createElement("div");
			toggleButton.className = "emoticonControlsButton";
			toggleButton.onclick = function (event)
			{
				entry.toggleSelection();
				event.stopPropagation();
			}

			toggleButton.appendChild(new FontIcon("fa fa-check", "*").element);

			//controls.appendChild(favoriteButton);
			controls.appendChild(toggleButton);
			element.appendChild(controls);

			var icon = document.createElement("i");
			icon.className = "fa fa-spinner fa-spin transformCenter positionAbsolute";

			var image = document.createElement("img");
			image.className = "emoticonEntryImage";
			image.src = emoticon.url;

			image.onload = function()
			{
				try{
					element.removeChild(icon);
				}
				catch(err)
				{
					console.log(err.message);
				}
			}

			var uses = 0;
			if ( preferences.get("emoticonInfo").uses )
			{
				uses = or(preferences.get("emoticonInfo").uses[emoticon.key],0)
			}
			element.title = emoticon.key + " " + emoticon.tag + " " + uses + " uses";
			element.appendChild(icon);
			element.appendChild(image);

			element.onclick = function ()
			{
				chat.input.element.value += entry.key;
				emoticonManager.hide();
				chat.input.focus();
			}

			entry.toggleSelection = function ()
			{
				if (entry.selected)
				{
					element.className = "emoticonEntry";
					emoticonManager.selectedEmoticons[entry.key] = null;
				}
				else
				{
					element.className = "emoticonEntry selected";
					emoticonManager.selectedEmoticons[entry.key] = true;
				}
				entry.selected = !entry.selected;

			}

			entry.element = element;
			return entry;
		}

		page.add = function (emoticon)
		{
			if (page.entries[emoticon.key])
			{
				page.remove(emoticon);
			}
			var entry = new EmoticonEntry(emoticon);
			page.element.appendChild(entry.element);
			page.entries[emoticon.key] = entry;
		}

		page.remove = function (emoticon)
		{
			page.element.removeChild(page.entries[emoticon.key].element);
			delete(page.entries[emoticon.key]);
		}

		return page;
	}

	var TabHeader = function (text, clickFunction)
	{
		var header = {};
		header.element = document.createElement("div");
		header.element.className = "tab";

		var headerSpan = document.createElement("div");
		headerSpan.className = "tabAlias";
		headerSpan.appendChild(document.createTextNode(text));
		header.element.appendChild(headerSpan);

		header.rename = function (text)
		{
			headerSpan.childNodes[0].nodeValue = text;
		}

		header.addButton = function (iconClassName, value, title, clickFunction, activeOnly)
		{
			var button = document.createElement("div");
			button.className = "tabHeaderButton";
			if ( activeOnly)
			{
				button.className += " activeOnly";
			}
			button.title = title;
			button.onclick = clickFunction;
			button.appendChild(new FontIcon(iconClassName, value).element);
			header.element.appendChild(button);
			return button;
		}

		header.element.onclick = clickFunction;

		return header;
	}

	var Tab = function (text, manager, id)
	{
		var tab = {};
		tab.id = id;
		if (tab.id == null)
		{
			tab.id = nyanpals.id.generate();
		}
		tab.manager = manager;
		tab.active = false;
		tab.page = new TabPage();
		tab.text = text;

		tab.header = new TabHeader(text,
			function ()
			{
				manager.switchTab(tab);
			}
		);

		tab.header.addButton("fa fa-level-down", "V", "Move selected emoticons to this page",
			function (event)
			{
				for (var key in emoticonManager.selectedEmoticons)
				{
					var emoticon = emoticons.get(key);
					manager.swap(emoticon, tab);
				}
				emoticonManager.selectedEmoticons = {};
				event.stopPropagation();
				preferences.save();
			}
		);

		tab.header.addButton("fa fa-tag", "R", "Rename this page to the contents of the input area",
			function (event)
			{
				var str = chat.input.element.value.trim();
				if (str.length > 0)
				{
					tab.rename(str);
					if (tab == emoticonManager.fallbackTab)
					{
						emoticonManager.fallbackTab = null;
					}
				}
				event.stopPropagation();
				preferences.save();
			}, true
		);

		tab.header.addButton("fa fa-close", "X", "Delete this page (relocates emoticons)",
			function (event)
			{
				manager.removeTab(tab);
				event.stopPropagation();
				preferences.save();
			}, true
		);

		tab.activate = function ()
		{
			tab.header.element.className = "tab active";
			tab.page.element.style.display = "block";
			tab.active = true;
		}

		tab.deactivate = function ()
		{
			tab.header.element.className = "tab inactive";
			tab.page.element.style.display = "none";
			tab.active = false;
		}

		tab.toggle = function ()
		{
			if (tab.active)
			{
				tab.deactivate();
			}
			else
			{
				tab.activate();
			}
		}

		tab.clearEntries = function ()
		{
			tab.page.clearEntries();
			while (tab.page.element.childNodes.length > 0)
			{
				tab.page.element.removeChild(tab.page.element.childNodes[0]);
			}
		}

		tab.rename = function (text)
		{
			tab.alias = text;
			preferences.get("emoticonInfo").tabs[tab.id].text = text;
			tab.header.rename(text);
		}

		return tab;
	}

	var EmoticonManager = function ()
	{
		var manager = {};
		manager.activeIndex = -1;
		manager.tabs = {};
		manager.element = document.createElement("div");
		manager.element.id = "emoticonManager";
		manager.header = document.createElement("div");
		manager.header.className = "tabHeader";
		manager.element.appendChild(manager.header);
		manager.selectedEmoticons = {};
		manager.fallbackTab = null;
		manager.linking = {}

		manager.hide = function ()
		{
			manager.element.style.display = "none";
		}

		manager.show = function ()
		{
			manager.element.style.display = "inline-block";
		}

		manager.toggle = function ()
		{
			if (manager.element.style.display === "none")
			{
				manager.show();
			}
			else
			{
				manager.hide();
			}
		}

		manager.resize = function (width, height)
		{
			height = or(height, width);
			for (k in manager.tabs)
			{
				for (kk in manager.tabs[k].page.entries)
				{
					manager.tabs[k].page.entries[kk].element.style.width = width;
					manager.tabs[k].page.entries[kk].element.style.height = height;
				}
			}
		}

		manager.addTab = function (tab, fallback)
		{
			while (manager.tabs[tab.id])
			{
				tab.id = nyanpals.id.generate();
			}
			if (!fallback)
			{
				preferences.get("emoticonInfo").tabs[tab.id] = {
					"id": tab.id,
					"text": tab.text,
					"emoticons": or(tab.emoticons,
					{}),
					"uses":{}
				};
			}
			else
			{
				manager.fallbackTab = tab;
			}
			manager.tabs[tab.id] = new Tab(tab.text, manager, tab.id);
			manager.header.appendChild(manager.tabs[tab.id].header.element);
			manager.element.appendChild(manager.tabs[tab.id].page.element);
			manager.switchTab(manager.tabs[tab.id]);
			return manager.tabs[tab.id];
		}

		manager.removeTab = function (tab)
		{
			if (tab == manager.fallbackTab)
			{
				return false;
			}

			for (var i = 0; i < tab.page.entries.length; i++)
			{
				var entry = tab.page.entries[i];
				manager.remove(emoticons[entry.key]);
				delete(preferences.get("emoticonInfo").tabs[tab.id].emoticons[entry.key]);
				manager.add(emoticons[entry.key]);
			}

			manager.header.removeChild(tab.header.element);
			emoticonManager.element.removeChild(tab.page.element);
			delete(preferences.get("emoticonInfo").tabs[tab.id]);
			delete(manager.tabs[tab.id]);
		}

		manager.add = function (emoticon)
		{
			var shouldFallback = true;
			var tab = null;
			for (k in preferences.get("emoticonInfo").tabs)
			{
				if (preferences.get("emoticonInfo").tabs[k].emoticons[emoticon.key])
				{
					tab = manager.tabs[k];
					tab.page.add(emoticon)
					shouldFallback = false;
				}
			}
			if (shouldFallback)
			{
				if (manager.fallbackTab == null)
				{
					manager.fallbackTab = manager.addTab(new Tab("(Auto)", manager), true);
					if (emoticonManager.tabs.length == 1 && !manager.fallbackTab.active)
					{
						manager.fallbackTab.toggle();
						emoticonManager.activeIndex = 0;
					}
				}
				tab = manager.fallbackTab;
				manager.fallbackTab.page.add(emoticon);
			}
			manager.linking[emoticon.key] = tab;
		}

		manager.remove = function (emoticon)
		{
			if ( manager.linking[emoticon.key])
			{
				manager.linking[emoticon.key].page.remove(emoticon);
			}
				delete(manager.linking[emoticon.key]);
		}

		manager.clearEmoticons = function ()
		{
			for (k in emoticons.items)
			{
				manager.remove(emoticons.items[k]);
			}

		}

		manager.clearTabs = function ()
		{

			for ( k in manager.tabs )
			{
				manager.removeTab(manager.tabs[k]);
			}
		}

		manager.clear = function()
		{
			manager.clearEmoticons();
			manager.clearTabs();
		}

		manager.switchTab = function (tab)
		{
			for (k in manager.tabs)
			{
				manager.tabs[k].deactivate();
			}
			tab.activate();
		}

		manager.swap = function (emoticon, tab)
		{
			if (preferences.get("emoticonInfo").tabs[manager.linking[emoticon.key].id])
			{
				delete(preferences.get("emoticonInfo").tabs[manager.linking[emoticon.key].id].emoticons[emoticon.key]);
			}
			manager.remove(emoticon);
			preferences.get("emoticonInfo").tabs[tab.id].emoticons[emoticon.key] = true;
			manager.add(emoticon);
		}

		var TabButton = function (className, title, clickFunction)
		{
			var button = {};
			button.element = document.createElement("div");
			button.element.className = "tabButton"
			button.element.appendChild(new FontIcon(className).element);
			button.element.title = title;
			button.element.onclick = clickFunction;
			return button;
		}

		manager.addTabButton = function (className, title, clickFunction)
		{
			manager.header.appendChild(new TabButton(className, title, clickFunction).element);
		}

		manager.addTabButton("fa fa-refresh", "Reload Emoticons",
			function (event)
			{
				reloadEmoticons();
			}
		);

		manager.addTabButton("fa fa-plus", "Add Tab",
			function (event)
			{
				manager.addTab(new Tab("Tab", manager))
				preferences.save();
			}
		);

		manager.addTabButton("fa fa-expand", "Increase Thumbnail Size",
			function (event)
			{
				preferences.get("emoticonInfo").thumbnailIndex++;
				if (preferences.get("emoticonInfo").thumbnailIndex >= thumbnailSizes.length)
				{
					preferences.get("emoticonInfo").thumbnailIndex = thumbnailSizes.length - 1;
				}
				else
				{
					manager.resize(thumbnailSizes[preferences.get("emoticonInfo").thumbnailIndex]);
				}
				preferences.save();
			}
		);

		manager.addTabButton("fa fa-compress", "Decrease Thumbnail Size",
			function (event)
			{
				preferences.get("emoticonInfo").thumbnailIndex--;
				if (preferences.get("emoticonInfo").thumbnailIndex < 0)
				{
					preferences.get("emoticonInfo").thumbnailIndex = 0;
				}
				else
				{
					manager.resize(thumbnailSizes[preferences.get("emoticonInfo").thumbnailIndex]);
				}
				preferences.save();
			}
		);

		manager.addTabButton("fa fa-sort", "Sort by Frequency, then Tag",
			function (event)
			{
				preferences.get("emoticonInfo").sortingIndex = 3;
				preferences.save();
				refreshEmoticons();
			}
		);


		manager.addTabButton("fa fa-sort-alpha-asc", "Sort by Tag",
			function (event)
			{
				preferences.get("emoticonInfo").sortingIndex = 2;
				preferences.save();
				refreshEmoticons();
			}
		);
		

		manager.addTabButton("fa fa-sort-amount-desc", "Sort by Frequency",
			function (event)
			{
				preferences.get("emoticonInfo").sortingIndex = 1;
				preferences.save();
				refreshEmoticons();
			}
		);


		manager.addTabButton("fa fa-ban", "Don't Sort",
			function (event)
			{
				preferences.get("emoticonInfo").sortingIndex = 0;
				preferences.save();
				refreshEmoticons();
			}
		);

		manager.addTabButton("fa fa-close", "Reset Emoticon Frequencies",
			function (event)
			{
				delete(preferences.get("emoticonInfo").uses);
				preferences.get("emoticonInfo").uses = {};
				refreshEmoticons();
			}
		);

		return manager;
	}

	var FontIcon = function (className)
	{
		var fontIcon = {};
		fontIcon.element = document.createElement("i");
		fontIcon.element.className = className;
		return fontIcon;
	}

	var ChatButtonCollection = function ()
	{
		var collection = {};
		collection.items = {};
		collection.element = document.getElementById("chatButtonWrapper");
		collection.add = function (key, className, clickFunction)
		{
			var button = new ChatButton(className, clickFunction);
			collection.items[key] = button;
			collection.element.appendChild(button.element);
		}
		collection.remove = function (key)
		{
			delete(collection.items[key]);
		}
		collection.get = function (key)
		{
			return collection.items[key];
		}
		return collection;
	}

	var ChatButton = function (className, clickFunction)
	{
		var button = {};
		button.element = document.createElement('div');
		button.element.className = 'chatButton';
		button.element.appendChild(new FontIcon(className).element);

		button.element.onclick = clickFunction;
		return button;
	}

	var FilterParser = function(element)
	{
		var parser = {};
		parser.parse = function (sender,element)
		{
			var nodes = [];
			for (var i = 0; i < element.childNodes.length; i++)
			{
				nodes.push(element.childNodes[i]);
			}
			while (nodes.length > 0)
			{
				var node = nodes[0];

				if (node.nodeType == 3)
				{
					var filters = [];
					var parsed = parseQuotedString(preferences.get("filters").replace("\n"," "));
					for ( var i = 0; i < parsed.length; i+=2 )
					{
						filters.push({search:parsed[i],replace:parsed[i+1]});
					}
					for (var k in filters)
					{
						var ranges = findRegexRanges(filters[k].search,"g",node.nodeValue);
			            for ( var kk in ranges)
			            {
			                var matchIndex = ranges[kk].start;
			                var before = node.nodeValue.substr(0,ranges[kk].start);
			                
			                var after = node.nodeValue.substr(ranges[kk].end);
			                node.nodeValue = before + filters[k].replace + after;
			             }  
					}
				}
				else
				{
					for (var j = 0; j < node.childNodes.length; j++)
					{
						nodes.push(node.childNodes[j]);
					}
				}
				nodes.shift();
			}
		}
		return parser;
	}

	var EmoticonParser = function ()
	{
		var parser = {};
		parser.parse = function (sender,element,chatRoom)
		{
			var nodes = [];
			for (var i = 0; i < element.childNodes.length; i++)
			{
				nodes.push(element.childNodes[i]);
			}
			while (nodes.length > 0)
			{
				var node = nodes[0];
				if (node.nodeType == 3)
				{
					var nodeValue = node.nodeValue;
					for (k in emoticons.items)
					{
						var emoticon = emoticons.items[k];
						var matchIndex = nodeValue.indexOf(emoticon.key);
						// matchIndex is the index at which the emoticons replacement was found
						if (matchIndex != -1)
						{
							if ( sender == chat.user.name)
							{
								if (!preferences.get("emoticonInfo").uses)
								{
									preferences.get("emoticonInfo").uses = {};
								}
								if (!preferences.get("emoticonInfo").uses[emoticon.key] )
								{
									preferences.get("emoticonInfo").uses[emoticon.key] = 0;
								}
								preferences.get("emoticonInfo").uses[emoticon.key]++;
								preferences.getPreference("emoticonInfo").save();
							}
							// The image element that will be replacing the emoticon text

							var image = document.createElement('img');
							image.src = emoticon.url;
							image.style.width = emoticon.width;
							image.style.height = emoticon.height;
							image.title = emoticon.key;
							image.alt = emoticon.key;

							image.onload = function()
							{
								chatRoom.scrollToBottom();
							}

							var before = document.createTextNode(nodeValue.substr(0, matchIndex));
							var after = document.createTextNode(nodeValue.substr(matchIndex + emoticon.key.length));
							node.parentNode.insertBefore(before, node);
							node.parentNode.insertBefore(image, node);
							node.parentNode.insertBefore(after, node);
							nodes.push(before);
							nodes.push(after);
							node.parentNode.removeChild(node);
							break;
						}
					}
				}
				else
				{
					for (var j = 0; j < node.childNodes.length; j++)
					{
						nodes.push(node.childNodes[j]);
					}
				}
				nodes.shift();
			}
		}
		return parser;
	}

	var AutolinkerParser = function ()
	{
		var parser = {};
		parser.parse = function (sender,element)
		{
			for (var i = 0; i < element.childNodes.length; i++)
			{
				var node = element.childNodes[i];
				if (node.nodeType == 3)
				{
					var newElement = document.createElement("div");
					var parseElement = $("<div>" + node.nodeValue + "</div>");
					$(newElement).append($("<div>" + Autolinker.link($(parseElement).text()) + "</div>"));
					node.parentNode.insertBefore(newElement, node);
					node.parentNode.removeChild(node);
				}
			}
		}
		return parser;
	}

	var AlertParser = function ()
	{
		var parser = {};
		parser.parse = function (sender,element)
		{
			var soundPlayed = false;
			var nodes = [];
			for (var i = 0; i < element.childNodes.length; i++)
			{
				nodes.push(element.childNodes[i]);
			}
			while (nodes.length > 0 && !soundPlayed)
			{
				var node = nodes[0];

				if (node.nodeType == 3)
				{
					var alerts = preferences.get("alerts").split("\n");
					if ( preferences.get("mention"))
					{
						alerts.push(chat.user.name);
					}
					for (var k in alerts)
					{
						if ( alerts[k].length > 0 && regexMatch(node.nodeValue,alerts[k]))
						{
							nyanpals.sound.play("./snd/alert.wav");
							soundPlayed = true;
							break;
						}
					}
				}
				else
				{
					for (var j = 0; j < node.childNodes.length; j++)
					{
						nodes.push(node.childNodes[j]);
					}
				}
				nodes.shift();
			}
		}
		return parser;
	}

	var OptionCollection = function ()
	{
		var collection = {};
		collection.items = {};
		collection.add = function (key, option)
		{
			collection.items[key] = option;
		}
		collection.remove = function (key)
		{
			delete(collection.items[key]);
		}
		collection.get = function (key)
		{
			return collection.items[key];
		}
		collection.load = function ()
		{
			for (k in collection.items)
			{
				collection.items[k].load();
			}
		}
		collection.save = function ()
		{
			for (k in collection.items)
			{
				collection.items[k].save();
			}
		}
		return collection;
	}

	var OptionManager = function ()
	{
		var manager = {};
		manager.element = document.createElement("div");
		manager.element.id = "optionManager";
		manager.entries = {};

		manager.add = function (key, option)
		{
			manager.entries[key] = option;
			manager.element.appendChild(option.element);
		}

		manager.remove = function (key)
		{
			manager.element.removeChild(manager.entries[key].element);
			delete(manager.entries[key]);
		}

		manager.get = function (key)
		{
			return manager.entries[key];
		}

		manager.hide = function ()
		{
			manager.element.style.display = "none";
		}

		manager.show = function ()
		{
			manager.element.style.display = "inline-block";
		}

		manager.toggle = function ()
		{
			if (manager.element.style.display === "none")
			{
				manager.show();
			}
			else
			{
				manager.hide();
			}
		}

		return manager;
	}

	var Option = function (preferenceKey)
	{
		var option = {};
		option.preferenceKey = preferenceKey;
		option.element = document.createElement("div");
		option.load = function () {}
		options.save = function () {}
		return option;
	}

	var BooleanOptionElement = function(text)
	{
		var boe = {};
		boe.element = document.createElement("div");
		boe.label = document.createElement("label");
		boe.checkbox = document.createElement("input");
		boe.checkbox.type = "checkbox";
		boe.checkbox.id = nyanpals.id.generate();
		boe.checkIcon = document.createElement("i");
		boe.checkIcon.className = "fa fa-check";
		boe.uncheckIcon = document.createElement("i");
		boe.uncheckIcon.className = "fa fa-close";

		boe.label.appendChild(document.createTextNode(text));
		boe.label.appendChild(boe.checkIcon);
		boe.label.appendChild(boe.uncheckIcon);
		boe.label.htmlFor = boe.checkbox.id;
		boe.element.appendChild(boe.checkbox);
		boe.element.appendChild(boe.label);
		return boe;
	}

	var BooleanOption = function (text, preferenceKey)
	{
		var option = new Option(preferenceKey);
		option.element.className = "optionWrapper";
		var boe = new BooleanOptionElement(text);
		option.element.appendChild(boe.element);
		option.check = function ()
		{
			boe.checkbox.checked = true;
		}
		option.uncheck = function ()
		{
			boe.checkbox.false = true;
		}
		option.save = function ()
		{
			preferences.getPreference(option.preferenceKey).save();
		}
		option.load = function ()
		{
			preferences.getPreference(option.preferenceKey).load();
			boe.checkbox.checked = preferences.get(option.preferenceKey);
		}
		boe.checkbox.onchange = function ()
		{
			preferences.getPreference(option.preferenceKey).set(boe.checkbox.checked);
			option.save();
		}
		return option;
	}

	var TextareaOptionElement = function(header)
	{
		var tao = {};
		tao.element = document.createElement("div");
		tao.header = document.createElement("div");
		tao.header.className = "optionHeader";
	    tao.header.appendChild(document.createTextNode(header));
	    tao.wrapper = document.createElement("div");
	    tao.wrapper.className = "optionTextareaWrapper";
	    tao.textarea = document.createElement("textarea");
	    tao.textarea.className = "optionTextarea";
	    tao.wrapper.appendChild(tao.textarea);
	    tao.save = document.createElement("div");
	    tao.save.className = "optionSave";
	    tao.icon = document.createElement("i");
	    tao.icon.className = "fa fa-floppy-o";
	    tao.save.appendChild(tao.icon);
	    tao.element.appendChild(tao.header);
	    tao.element.appendChild(tao.wrapper);
	    tao.element.appendChild(tao.save);
		return tao;
	}

	var TextareaOption = function (text, preferenceKey)
	{
		var option = new Option(preferenceKey);
		option.element.className = "optionWrapper";
		
		var toe = new TextareaOptionElement(text);
	    option.element.appendChild(toe.element);
	    toe.save.onclick = function()
	    {
	    	option.save();
	    }
		option.save = function ()
		{
			preferences.getPreference(option.preferenceKey).set(toe.textarea.value);
			preferences.getPreference(option.preferenceKey).save();
		}
		option.load = function ()
		{
			preferences.getPreference(option.preferenceKey).load();
			 toe.textarea.value = preferences.get(option.preferenceKey);
		}
		return option;
	}

	var ButtonOptionElement = function(text)
	{
		var boe = {};
		boe.element = document.createElement("div");
		boe.button = document.createElement("div");
		boe.button.className = "optionButton";
		boe.button.appendChild(document.createTextNode(text));
		boe.element.appendChild(boe.button);
		return boe;
	}

	var ButtonOption = function(text, clickFunction)
	{
		var option = new Option(null);
		var boe = new ButtonOptionElement(text);
		boe.element.onclick = clickFunction;
		option.element.appendChild(boe.element);
		
		return option;
	}
	
	var ImportExportOption = function()
	{
		var option = new Option(null);
		option.element.className = "optionWrapper";
		var header = document.createElement("div");
		header.className = "optionHeader";
		header.style.marginTop = "4px";
		header.appendChild(document.createTextNode("Import/Export Preferences"));
		option.element.appendChild(header);
		var textArea = document.createElement("textarea");
		textArea.className = "optionTextarea";
		textArea.placeholder = "Valid JSON";
		option.element.appendChild(textArea);
		var importButton = new ButtonOptionElement("Import");
		var exportButton = new ButtonOptionElement("Export");
		option.element.appendChild(importButton.element);
		option.element.appendChild(exportButton.element);
		
		importButton.element.onclick = function()
		{
			emoticonManager.clear();
			preferences.import(textArea.value);
			textArea.value = "";
			updateEmoticonManager();
			refreshEmoticons();
			chat.addSystemMessage("system","Import complete.","fa fa-checkmark");
		}
		exportButton.element.onclick = function()
		{
			textArea.value = preferences.export();
			chat.addSystemMessage("system","Export complete.","fa fa-checkmark");
		}
		return option;
	}

	var PublicationSettingCollection = function ()
	{
		var collection = {};
		collection.items = {};
		collection.add = function (key, setting)
		{
			collection.items[key] = setting;
		}
		collection.remove = function (key)
		{
			delete(collection.items[key]);
		}
		collection.get = function (key)
		{
			return collection.items[key];
		}
		collection.update = function ()
		{
			for (k in collection.items)
			{
				collection.items[k].update();
			}
		}
		return collection;
	}

	var PublicationManager = function ()
	{
		var manager = {};
		manager.element = document.createElement("div");
		manager.element.id = "publicationManager";

		var streamGuideSpan = document.createElement("div");
		streamGuideSpan.style.display = "block";
		streamGuideSpan.style.textAlign = "center";
		streamGuideSpan.style.fontSize = "16px";
		var streamGuideLink = document.createElement("a");
		streamGuideLink.href = "#";
		streamGuideLink.id = "btnOpenStreamGuide";
		streamGuideLink.appendChild(document.createTextNode("Need help streaming? Click here!"));
		streamGuideSpan.appendChild(streamGuideLink );
		streamGuideLink.onclick = function()
		{
			document.getElementById("streamHelp").style.display = "table-row";
		}

		manager.element.appendChild(streamGuideSpan);
		manager.entries = {};

		manager.add = function (key, setting)
		{
			manager.entries[key] = setting;
			manager.element.appendChild(setting.element);
		}

		manager.remove = function (key)
		{
			manager.element.removeChild(manager.entries[key].element);
			delete(manager.entries[key]);
		}

		manager.get = function (key)
		{
			return manager.entries[key];
		}

		manager.hide = function ()
		{
			manager.element.style.display = "none";
		}

		manager.show = function ()
		{
			manager.update();
			manager.element.style.display = "inline-block";
		}

		manager.update = function ()
		{
			for (k in manager.entries)
			{
				manager.entries[k].update();
			}
		}

		manager.toggle = function ()
		{
			if (manager.element.style.display === "none")
			{
				manager.show();
			}
			else
			{
				manager.hide();
			}
		}

		return manager;
	}

	var PublicationSetting = function ()
	{
		var setting = {};
		setting.element = document.createElement("div");
		setting.update = function()
		{

		}
		return setting;
	}

	var PublicationInfoPublicationSetting = function()
	{
		var setting = new PublicationSetting();
		setting.element.className = "optionWrapper";
		var streamurlHeader = document.createElement("div");
		streamurlHeader.className = "optionHeader";
		streamurlHeader.appendChild(document.createTextNode("Stream URL"));
		setting.element.appendChild(streamurlHeader);
		var streamurl = document.createElement("textarea");
		streamurl.className = "optionTextarea";
		streamurl.placeholder = "Stream URL";
		streamurl.rows = 1;
		streamurl.style.resize = "none";
		setting.element.appendChild(streamurl);
		var streamkeyHeader = document.createElement("div");
		streamkeyHeader.className = "optionHeader";
		streamkeyHeader.style.marginTop = "4px";
		streamkeyHeader.appendChild(document.createTextNode("Stream Key"));
		setting.element.appendChild(streamkeyHeader);
		var streamkey = document.createElement("textarea");
		streamkey.className = "optionTextarea";
		streamkey.placeholder = "Stream Key";
		streamkey.rows = 1;
		streamkey.style.resize = "none";
		setting.element.appendChild(streamkey);
		document.addEventListener("onStreamPublicationInfo",function(event)
		{
			streamurl.value = event.detail.url;
			streamkey.value = event.detail.key;
		})

		setting.update = function()
		{
			nyanpals.websocket.send("onRequestStreamPublication");
		}
		return setting;
	}

	var PublicationRestrictionsPublicationSetting = function()
	{
		var setting = new PublicationSetting();
		setting.element.className = "optionWrapper";

		var inviteOnlyOption = new BooleanOptionElement("Invite Only?");
		inviteOnlyOption.checkbox.onchange = function()
		{
			nyanpals.websocket.send("onUpdatePublicationSettings",
			{
				"inviteOnly": inviteOnlyOption.checkbox.checked
			});
		}
		setting.element.appendChild(inviteOnlyOption.element);

		var restrictionOption = new BooleanOptionElement("NSFW?");
		restrictionOption.checkbox.onchange = function()
		{
			nyanpals.websocket.send("onUpdatePublicationSettings",
			{
				"restriction": restrictionOption.checkbox.checked
			});
		}
		setting.element.appendChild(restrictionOption.element);

		document.addEventListener("onStreamPublicationInfo",function(event)
		{
			announceOption.checkbox.checked = event.detail.announce;
			restrictionOption.checkbox.checked = event.detail.restriction;
		})

		var announceOption = new BooleanOptionElement("Announce?");
		announceOption.checkbox.onchange = function()
		{
			nyanpals.websocket.send("onUpdatePublicationSettings",
			{
				"announce": announceOption.checkbox.checked
			});
		}
		setting.element.appendChild(announceOption.element);

		var killUsers = new ButtonOptionElement("Force Disconnect Users");
		killUsers.button.onclick = function()
		{
			nyanpals.websocket.send("onForceStreamUsersDisconnect");
		}
		setting.element.appendChild(killUsers.element);

		document.addEventListener("onStreamPublicationInfo",function(event)
		{
			inviteOnlyOption.checkbox.checked = event.detail.inviteOnly;
			restrictionOption.checkbox.checked = event.detail.restriction;
		})

		setting.update = function()
		{

		}
		return setting;
	}

	var InputHistory = function()
	{
		var inputHistory = {};
		inputHistory.index = 0;
		inputHistory.history = [];
		inputHistory.add = function(input)
		{
			inputHistory.history.push(input);
			inputHistory.index = inputHistory.history.length;
		}
		inputHistory.next = function()
		{
			inputHistory.index++;
			if ( inputHistory.index >= inputHistory.history.length)
			{
				inputHistory.index = inputHistory.history.length-1;
			}
			return inputHistory.history[inputHistory.index];
		}
		inputHistory.previous = function()
		{
			inputHistory.index--;
			if ( inputHistory.index < 0)
			{
				inputHistory.index = 0;
			}
			return inputHistory.history[inputHistory.index];
		}
		inputHistory.isFront = function()
		{
			return inputHistory.index == inputHistory.history.length;
		}
		return inputHistory;
	}

	var InfoPanel = function()
	{
		var infoPanel = {};
		infoPanel.element = document.getElementById("info");
		infoPanel.show = function()
		{
			infoPanel.element.style.display = "initial";
			var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
			    if (xhttp.readyState == 4 && xhttp.status == 200) {
			    	var xml = xhttp.responseXML;
			    	var received = Math.floor(Number(xml.getElementsByTagName("traffic")[0].children[0].children[0].textContent)/1024);
			    	var transferred = Math.floor(Number(xml.getElementsByTagName("traffic")[0].children[0].children[1].textContent)/1024);
			    	$("#bandwidthUsage").text( "R/T: " + received +"MiB/" + transferred + "MiB" );
			    	/* Monthly 
			    	var received = Math.floor(Number(xml.getElementsByTagName("traffic")[0].children[2].children[0].children[1].textContent)/1024);
			    	var transferred = Math.floor(Number(xml.getElementsByTagName("traffic")[0].children[2].children[0].children[2].textContent)/1024);
			    	*/
			    }
			};
			xhttp.open("GET", "./bandwidth.xml", true);
			xhttp.send();
		}
		infoPanel.hide = function()
		{
			infoPanel.element.style.display = "none";
		}
		infoPanel.toggle = function()
		{
			if (infoPanel.element.style.display === "none")
			{
				infoPanel.show();
			}
			else
			{
				infoPanel.hide();
			}
		}
		infoPanel.hide();
		return infoPanel;
	}

	var Events = {
		onChatInput: function(text)
		{
			var event = new CustomEvent("onChatInput",
			{
				"detail":
				{
					"text":text
				}
			});
			document.dispatchEvent(event);
		},
		onUserJoinRoom: function(username)
		{
			var event = new CustomEvent("onUserJoinRoom",
			{
				"detail":
				{
					"username": username
				}
			});
			document.dispatchEvent(event);
		},
		onUserLeaveRoom: function(username)
		{
			var event = new CustomEvent("onUserLeaveRoom",
			{
				"detail":
				{
					"username": username
				}
			});
			document.dispatchEvent(event);
		},
		onChatMessage: function(room)
		{
			var event = new CustomEvent("onChatMessage",
			{
				"detail":
				{
					room: room
				}
			});
			document.dispatchEvent(event);
		},
		onPrivateMessage: function(room)
		{
			var event = new CustomEvent("onPrivateMessage",
			{
				"detail":
				{
					room: room
				}
			});
			document.dispatchEvent(event);
		},
		onRequestStreamPublication: function()
		{
			websocket.send("onRequestStreamPublication");
		},
		onStreamPublicationInfo: function(data)
		{
			var event = new CustomEvent("onStreamPublicationInfo",
				{
					"detail":
					{
						"url":"rtmp://" + window.location.hostname + data.url,
						"key":data.key,
						"inviteOnly": data.inviteOnly,
						"restriction": data.restriction,
						"description": data.description,
						"announce": data.announce,
					}
				}
			);
			document.dispatchEvent(event);
		}
	}

	initialize();
})(window, document);