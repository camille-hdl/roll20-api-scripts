// Github:   https://github.com/shdwjk/Roll20API/blob/master/TokenLock/TokenLock.js
// By:       The Aaron, Arcane Scriptomancer
// Contact:  https://app.roll20.net/users/104025/the-aaron

var TokenLock = TokenLock || (function() {
    'use strict';

    var version = '0.2.4',
        lastUpdate = 1428859122,
    	schemaVersion = 0.2,

	ch = function (c) {
		var entities = {
			'<' : 'lt',
			'>' : 'gt',
			"'" : '#39',
			'@' : '#64',
			'{' : '#123',
			'|' : '#124',
			'}' : '#125',
			'[' : '#91',
			']' : '#93',
			'"' : 'quot',
			'-' : 'mdash',
			' ' : 'nbsp'
		};

		if(_.has(entities,c) ){
			return ('&'+entities[c]+';');
		}
		return '';
	},

    getCommandOption_ToggleLock = function() {
        var text = (state.TokenLock.locked ? '<span style="color: #990000;">Locked</span>' : '<span style="color: #009900;">Unlocked</span>' );
        return '<div>'
            +'Tokens are now <b>'
                +text
            +'</b>. '
            +'<a href="!tl --toggle-lock">'
                +'Toggle'
            +'</a>'
        +'</div>';
        
    },

    getConfigOption_AllowMoveOnTurn = function() {
        var text = (state.TokenLock.config.allowMoveOnTurn ? 'On' : 'Off' );
        return '<div>'
            +'Allow Move on Turn is currently <b>'
                +text
            +'</b> '
            +'<a href="!tl-config --toggle-allowmoveonturn">'
                +'Toggle'
            +'</a>'
        +'</div>';
        
    },

	showHelp = function(who) {
		var stateColor = (state.TokenLock.locked) ? ('#990000') : ('#009900'),
		    stateName  = (state.TokenLock.locked) ? ('Locked') : ('Unlocked');

        sendChat('',
            '/w '+who+' '
+'<div style="border: 1px solid black; background-color: white; padding: 3px 3px;">'
	+'<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">'
		+'<div style="float:right;width:90px;border:1px solid black;background-color:#ffc;text-align:center;font-size: 70%;"><span style="color: '+stateColor+'; font-weight:bold; padding: 0px 4px;">'+stateName+'</span></div>'
		+'TokenLock v'+version
		+'<div style="clear: both"></div>'
	+'</div>'
	+'<div style="padding-left:10px;margin-bottom:3px;">'
		+'<p>TokenLock allows the GM to selectively prevent players from moving their tokens. '
		+'Since <i><u>change:graphic</u></i> events to not specify who changed the '
		+'graphic, determination of player tokens is based on whether that token '
		+'has an entry in the <b>controlled by</b> field of either the token or '
		+'the character it represents.  If <b>controlled by</b> is empty, the '
		+'GM can freely move the token at any point.  If there is any entry in '
		+'<b>controlled by</b>, the token can only be moved when TokenLock is '
		+'unlocked. </p>'
		+ '<p>Moving of player controlled cards is still permissible. </p>'
	+'</div>'
	+'<b>Commands</b>'
	+'<div style="padding-left:10px;"><b><span style="font-family: serif;">!tl</span></b>'
		+'<div style="padding-left: 10px;padding-right:20px">'
			+'Executing the command with no arguments prints this help.  The following arguments may be supplied in order to change the configuration.  All changes are persisted between script restarts.'
			+'<ul>'
				+'<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;">'
					+'<b><span style="font-family: serif;">lock</span></b> -- Locks the player tokens to prevent moving them.'
				+'</li> '
				+'<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;">'
					+'<b><span style="font-family: serif;">unlock</span></b> -- Unlocks the player tokens allowing them to be moved.'
				+'</li> '
			+'</ul>'
		+'</div>'
	+'</div>'
    +getCommandOption_ToggleLock()
	+'<div style="padding-left:10px;">'
		+'<b><span style="font-family: serif;">!tl-config ['+ch('<')+'Options'+ch('>')+'|--help]</span></b>'
		+'<div style="padding-left: 10px;padding-right:20px">'
			+'<p>Swaps the selected Tokens for their counterparts on the other layer.</p>'
			+'<ul>'
				+'<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;">'
					+'<b><span style="font-family: serif;">--help</span></b> '+ch('-')+' Shows the Help screen'
				+'</li> '
				+'<li style="border-top: 1px solid #ccc;border-bottom: 1px solid #ccc;">'
					+'<b><span style="font-family: serif;">--toggle-allowmoveonturn</span></b> '+ch('-')+' Sets whether tokens can be moved if they are at the top of the turn order.'
				+'</li> '
			+'</ul>'
		+'</div>'
	+'</div>'
    +getConfigOption_AllowMoveOnTurn()
+'</div>'
            );
    },

	handleInput = function(msg) {
		var args,who;

		if (msg.type !== "api" || !playerIsGM(msg.playerid) ) {
			return;
		}
        who=getObj('player',msg.playerid).get('_displayname').split(' ')[0];

		args = msg.content.split(/\s+/);
		switch(args.shift()) {
            case '!tl':
                if(_.contains(args,'--help')) {
                    showHelp(who);
                    return;
                }
				switch(args.shift()) {
					case 'lock':
                        state.TokenLock.locked=true;
                        sendChat('TokenLock','/w gm '
                            +getCommandOption_ToggleLock()
                        );

						break;

					case 'unlock':
                        state.TokenLock.locked=false;
                        sendChat('TokenLock','/w gm '
                            +getCommandOption_ToggleLock()
                        );
						break;

					case '--toggle-lock':
                        state.TokenLock.locked= !state.TokenLock.locked;
                        sendChat('TokenLock','/w gm '
                            +getCommandOption_ToggleLock()
                        );
						break;

					default:
						showHelp(who);
						break;
				}
                break;

            case '!tl-config':
                if(_.contains(args,'--help')) {
                    showHelp(who);
                    return;
                }
                if(!args.length) {
                    sendChat('','/w '+who+' '
+'<div style="border: 1px solid black; background-color: white; padding: 3px 3px;">'
	+'<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">'
		+'TokenLock v'+version
	+'</div>'
    +getConfigOption_AllowMoveOnTurn()
+'</div>'
                    );
                    return;
                }
                _.each(args,function(a){
                    var opt=a.split(/\|/);

                    switch(opt.shift()) {
                        case '--toggle-allowmoveonturn':
                            state.TokenLock.config.allowMoveOnTurn = !state.TokenLock.config.allowMoveOnTurn;
                            sendChat('','/w '+who+' '
                                +'<div style="border: 1px solid black; background-color: white; padding: 3px 3px;">'
                                    +getConfigOption_AllowMoveOnTurn()
                                +'</div>'
                            );
                            break;

                        default:
                            sendChat('','/w '+who+' '
                                +'<div><b>Unsupported Option:</div> '+a+'</div>'
                            );
                    }
                });
                break;
		}

	},

	handleMove = function(obj,prev) {
		if(state.TokenLock.locked 
			&& 'token' === obj.get('subtype')
            && ( !state.TokenLock.config.allowMoveOnTurn || (( (JSON.parse(Campaign().get('turnorder'))||[{id:false}])[0].id) !== obj.id) )
			&& ( obj.get('left') !== prev.left || obj.get('top') !== prev.top || obj.get('rotation') !== prev.rotation )
		) {
			if('' !== obj.get('controlledby')) {
				obj.set({left: prev.left, top: prev.top, rotation: prev.rotation});	
			} else if('' !== obj.get('represents') ) {
				var character = getObj('character',obj.get('represents'));
				if( character && character.get('controlledby') ) {
					obj.set({left: prev.left, top: prev.top, rotation: prev.rotation});	
				}
			}
		}
	},

    checkInstall = function() {    
        log('-=> TokenLock v'+version+' <=-  ['+(new Date(lastUpdate*1000))+']');

        if( ! _.has(state,'TokenLock') || state.TokenLock.version !== schemaVersion) {
            log('  > Updating Schema to v'+schemaVersion+' <');
            switch(state.TokenLock && state.TokenLock.version) {
                case 0.1:
                    state.TokenLock.config={
                        allowMoveOnTurn: false
                    };
                    state.TokenLock.version=schemaVersion;
                    break;

                default:
                    state.TokenLock = {
                        version: schemaVersion,
                        config: {
                            allowMoveOnTurn: false
                        },
                        locked: false
                    };
            }
		} 
	},

	registerEventHandlers = function() {
		on('chat:message', handleInput);
		on('change:graphic', handleMove);
	};

	return {
		RegisterEventHandlers: registerEventHandlers,
		CheckInstall: checkInstall
	};
}());

on("ready",function(){
	'use strict';

	TokenLock.CheckInstall(); 
	TokenLock.RegisterEventHandlers();
});
