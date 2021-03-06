var ShapedScripts =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const Roll20 = __webpack_require__(1);
	const parseModule = __webpack_require__(3);
	const mmFormat = __webpack_require__(4);
	const Logger = __webpack_require__(5);
	const EntityLookup = __webpack_require__(6);
	const JSONValidator = __webpack_require__(8);
	const EntityLookupResultReporter = __webpack_require__(9);
	const Reporter = __webpack_require__(10);
	const ShapedScripts = __webpack_require__(11);


	const roll20 = new Roll20();
	const myState = roll20.getState('ShapedScripts');
	const logger = new Logger('5eShapedCompanion', roll20);
	const el = new EntityLookup();
	const reporter = new Reporter(roll20, 'Shaped Scripts');
	const shaped = new ShapedScripts(logger, myState, roll20, parseModule.getParser(mmFormat, logger), el, reporter);
	const elrr = new EntityLookupResultReporter(logger, reporter);


	roll20.logWrap = 'roll20';
	logger.wrapModule(el);
	logger.wrapModule(roll20);

	const jsonValidator = new JSONValidator(mmFormat);
	el.configureEntity('monsters', [EntityLookup.jsonValidatorAsEntityProcessor(jsonValidator)],
	  EntityLookup.jsonValidatorAsVersionChecker(jsonValidator, 'monsters'));
	el.configureEntity('spells', [], EntityLookup.getVersionChecker('1.0.0', 'spells'));

	roll20.on('ready', () => {
	  shaped.checkInstall();
	  shaped.registerEventHandlers();
	});

	module.exports = {
	  addEntities(entities) {
	    try {
	      if (typeof entities === 'string') {
	        entities = JSON.parse(entities);
	      }
	      // Suppress excessive logging when adding big lists of entities
	      const prevLogLevel = logger.getLogLevel();
	      logger.setLogLevel(Logger.levels.INFO);
	      el.addEntities(entities, elrr);
	      logger.setLogLevel(prevLogLevel);
	    }
	    catch (e) {
	      reporter.reportError('JSON parse error, please see log for more information');
	      logger.error(e.toString());
	      logger.error(e.stack);
	    }
	  },
	};


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/* globals state, createObj, findObjs, getObj, getAttrByName, sendChat, on, log, Campaign, playerIsGM, spawnFx,
	 spawnFxBetweenPoints, filterObjs, randomInteger, setDefaultTokenForCharacter, onSheetWorkerCompleted */
	'use strict';
	const _ = __webpack_require__(2);

	// noinspection JSUnusedLocalSymbols
	module.exports = class Roll20Wrapper {

	  getState(module) {
	    if (!state[module]) {
	      state[module] = {};
	    }
	    return state[module];
	  }

	  createObj(type, attributes) {
	    return createObj(type, attributes);
	  }

	  findObjs(attributes, options) {
	    return findObjs(attributes, options);
	  }

	  filterObjs(attributes) {
	    return filterObjs(attributes);
	  }

	  getObj(type, id) {
	    return getObj(type, id);
	  }

	  getOrCreateObj(type, attributes) {
	    const newAttributes = _.extend(_.clone(attributes), { type });
	    const existing = this.findObjs(newAttributes);
	    switch (existing.length) {
	      case 0:
	        return this.createObj(type, newAttributes);
	      case 1:
	        return existing[0];
	      default:
	        throw new Error(`Asked for a single ${type} but more than 1 was found matching attributes: ` +
	          `${JSON.stringify(attributes)}. Found attributes: ${JSON.stringify(existing)}`);
	    }
	  }

	  getAttrByName(character, attrName, valueType) {
	    return getAttrByName(character, attrName, valueType);
	  }

	  checkCharacterFlag(character, flag) {
	    const value = this.getAttrByName(character, flag);
	    switch (typeof value) {
	      case 'boolean':
	        return value;
	      case 'number':
	        return !!value;
	      default:
	        return value === '1' || value === 'on';
	    }
	  }

	  getAttrObjectByName(character, attrName) {
	    const attr = this.findObjs({ type: 'attribute', characterid: character, name: attrName },
	      { caseInsensitive: true });
	    return attr && attr.length > 0 ? attr[0] : null;
	  }

	  getOrCreateAttr(characterId, attrName) {
	    return this.getOrCreateObj('attribute', { characterid: characterId, name: attrName });
	  }

	  setAttrByName(characterId, attrName, value) {
	    this.getOrCreateAttr(characterId, attrName).set('current', value);
	  }

	  processAttrValue(characterId, attrName, cb) {
	    const attribute = this.getOrCreateAttr(characterId, attrName);
	    const newVal = cb(attribute.get('current'));
	    attribute.set('current', newVal);
	    return newVal;
	  }

	  getRepeatingSectionAttrs(characterId, sectionName) {
	    const prefix = `repeating_${sectionName}`;
	    return _.filter(this.findObjs({ type: 'attribute', characterid: characterId }),
	      attr => attr.get('name').indexOf(prefix) === 0);
	  }

	  getRepeatingSectionItemIdsByName(characterId, sectionName) {
	    const re = new RegExp(`repeating_${sectionName}_([^_]+)_name$`);
	    return _.reduce(this.getRepeatingSectionAttrs(characterId, sectionName),
	      (lookup, attr) => {
	        const match = attr.get('name').match(re);
	        if (match) {
	          lookup[attr.get('current').toLowerCase()] = match[1];
	        }
	        return lookup;
	      }, {});
	  }

	  getCurrentPage(playerId) {
	    let pageId;
	    if (this.playerIsGM(playerId)) {
	      pageId = this.getObj('player', playerId).get('lastpage');
	    }
	    else {
	      pageId = this.getCampaign().get('playerspecificpages')[playerId] || this.getCampaign().get('playerpageid');
	    }

	    return pageId ? this.getObj('page', pageId) : null;
	  }

	  spawnFx(pointsArray, fxType, pageId) {
	    switch (pointsArray.length) {
	      case 1:
	        spawnFx(pointsArray[0].x, pointsArray[0].y, fxType, pageId);
	        break;
	      case 2:
	        spawnFxBetweenPoints(pointsArray[0], pointsArray[1], fxType, pageId);
	        break;
	      default:
	        throw new Error('Wrong number of points supplied to spawnFx: $$$', pointsArray);
	    }
	  }

	  playerIsGM(playerId) {
	    return playerIsGM(playerId);
	  }

	  getCampaign() {
	    return Campaign(); // eslint-disable-line
	  }

	  sendChat(sendAs, message, callback, options) {
	    return sendChat(sendAs, message, callback, options);
	  }

	  on(event, callback) {
	    return on(event, callback);
	  }

	  randomInteger(max) {
	    return randomInteger(max);
	  }

	  log(msg) {
	    return log(msg);
	  }

	  setDefaultTokenForCharacter(character, token) {
	    return setDefaultTokenForCharacter(character, token);
	  }

	  onSheetWorkerCompleted(cb) {
	    onSheetWorkerCompleted(cb);
	  }

	  setAttrWithWorker(character, attrName, attrValue, cb) {
	    const attr = this.getOrCreateAttr(character, attrName);
	    if (cb) {
	      onSheetWorkerCompleted(cb);
	    }
	    attr.setWithWorker({ current: attrValue });
	  }

	  createAttrWithWorker(character, attrName, attrValue, cb) {
	    const attr = this.createObj('attribute', { characterid: character, name: attrName });
	    if (cb) {
	      onSheetWorkerCompleted(cb);
	    }
	    attr.setWithWorker({ current: attrValue });
	  }
	};



/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = _;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);

	/**
	 * A specification of a field that can appear
	 * in the format that this parser processes
	 * @typedef {Object} FieldSpec
	 * @property {FieldSpec[]} [contentModel] - list of child fieldSpecs for complex content
	 * @property {boolean} [bare] - if true this field appears as a bare value with no parseToken in front of it
	 * @property {string} [parseToken] - the token that defines the beginning of this field (usually case insensitive). Not
	 *   used for bare tokens.
	 * @property {string} [pattern] - a pattern that defines the value of this field. For bare properties this will
	 *   determine if the field matches at all, whereas for normal ones this will just be used to validate them
	 * @property {number} [forNextMatchGroup] - the 1-based index of the match group from the supplied pattern that will
	 *   contain text that should be handed to the next parser rather than used as part of this field.
	 * @property {number} [forPreviousMatchGroup] - the 1-based index of the match group from the supplied pattern that
	 *   will contain text that should be handed to the previous parser to complete its value rather than used as part of
	 *   this field. Only applicable to bare properties, since ones with a token have a clearly defined start based on the
	 *   parseToken
	 * @property {number} [matchGroup=0] - the index of the capturing group in the supplied pattern to use as the value for
	 *   this field. If left at the default of 0, the whole match will be used.
	 * @property {boolean} [caseSensitive=false] - If true, the pattern used for the value of this field will be made case
	 *   sensitive. Note that parseToken matching is always case insensitive.
	 * @property {string} type - the type of this field. Currently valid values are [orderedContent, unorderedContent,
	 *   string, enumType, integer, abililty]
	 * @property {string[]} enumValues - an array of valid values for this field if the type is enumType
	 * @property {number} [minOccurs=1] - the minimum number of times this field should occur in the parent content model.
	 * @property {number} [maxOccurs=1] - the maximum number of times this field should occur in the parent content model.
	 */


	/**
	 *
	 * @param {FieldSpec} formatSpec - Root format specification for this parser
	 * @param logger - Logger object to use for reporting errors etc.
	 * @returns {{parse: ((*))}} - A parser that will process text in the format specified by the supplied formatSpec into
	 *   JSON objects
	 */
	function getParser(formatSpec, logger) {
	  // noinspection JSUnusedGlobalSymbols
	  const parserModule = {

	    makeContentModelParser(fieldSpec, ordered) {
	      const module = this;
	      return {
	        parse(stateManager, textLines, resume) {
	          const parseState = stateManager.enterChildParser(this, resume);
	          let someMatch = false;
	          let canContinue;
	          let stopParser = null;

	          parseState.subParsers = parseState.subParsers || module.makeParserList(fieldSpec.contentModel);


	          if (parseState.resumeParser) {
	            if (!parseState.resumeParser.resumeParse(stateManager, textLines)) {
	              stateManager.leaveChildParser(this);
	              return false;
	            }

	            someMatch = true;
	          }

	          function parseRunner(parser, index, parsers) {
	            if (!parser.parse(stateManager, textLines)) {
	              if (parser.required === 0 || !ordered) {
	                // No match but it's ok to keep looking
	                // through the rest of the content model for one
	                return false;
	              }

	              // No match but one was required here by the content model
	            }
	            else {
	              parser.justMatched = true;
	              if (parser.required > 0) {
	                parser.required--;
	              }
	              parser.allowed--;
	              if (ordered) {
	                // Set all the previous parsers to be exhausted since we've matched
	                // this one and we're in a strictly ordered content model.
	                _.each(parsers.slice(0, index), _.partial(_.extend, _, { allowed: 0 }));
	              }
	            }
	            return true;
	          }

	          do {
	            stopParser = _.find(parseState.subParsers, parseRunner);
	            logger.debug('Stopped at parser $$$', stopParser);
	            canContinue = stopParser && stopParser.justMatched;
	            if (stopParser) {
	              someMatch = someMatch || stopParser.justMatched;
	              stopParser.justMatched = false;
	            }

	            // Lose any parsers that have used up all their cardinality already
	            parseState.subParsers = _.reject(parseState.subParsers, { allowed: 0 });
	          } while (!_.isEmpty(parseState.subParsers) && !_.isEmpty(textLines) && canContinue);

	          stateManager.leaveChildParser(this, someMatch ? parseState : undefined);

	          return someMatch;
	        },

	        resumeParse(stateManager, textLines) {
	          return this.parse(stateManager, textLines, true);
	        },
	        complete(parseState/* , finalText*/) {
	          const missingContent = _.filter(parseState.subParsers, 'required');
	          if (!_.isEmpty(missingContent)) {
	            throw new MissingContentError(missingContent);
	          }
	        },
	      };
	    },

	    matchParseToken(myParseState, textLines) {
	      if (_.isEmpty(textLines) || this.bare) {
	        return !_.isEmpty(textLines);
	      }

	      const re = new RegExp(`^(.*?)(${this.parseToken})(?:[\\s.]+|$)`, 'i');
	      const match = textLines[0].match(re);
	      if (match) {
	        logger.debug('Found match $$$', match[0]);
	        myParseState.forPrevious = match[1];
	        myParseState.text = '';
	        textLines[0] = textLines[0].slice(match[0].length).trim();
	        if (!textLines[0]) {
	          textLines.shift();
	        }
	      }

	      return !!match;
	    },

	    matchValue(myParseState, textLines) {
	      if (this.pattern && this.bare) {
	        // If this is not a bare value then we can take all the text up to next
	        // token and just validate it at the end. If it is, then the pattern itself
	        // defines whether this field matches and we must run it immediately.

	        if (_.isEmpty(textLines)) {
	          return false;
	        }
	        textLines[0] = textLines[0].trim();

	        const matchGroup = this.matchGroup || 0;
	        const re = new RegExp(this.pattern, this.caseSensitive ? '' : 'i');
	        logger.debug('$$$ attempting to match value [$$$] against regexp $$$', this.name, textLines[0], re.toString());
	        const match = textLines[0].match(re);

	        if (match) {
	          logger.debug('Successful match! $$$', match);
	          myParseState.text = match[matchGroup];
	          if (!myParseState.forPrevious && this.forPreviousMatchGroup) {
	            logger.debug('Setting forPrevious to  $$$', match[this.forPreviousMatchGroup]);
	            myParseState.forPrevious = match[this.forPreviousMatchGroup];
	          }
	          textLines[0] = textLines[0].slice(match.index + match[0].length);
	          if (this.forNextMatchGroup && match[this.forNextMatchGroup]) {
	            textLines[0] = match[this.forNextMatchGroup] + textLines[0];
	          }

	          if (!textLines[0]) {
	            myParseState.text += '\n';
	            textLines.shift();
	          }
	          return true;
	        }

	        logger.debug('Match failed');
	        return false;
	      }

	      logger.debug('$$$ standard string match, not using pattern', this.name);
	      myParseState.text = '';
	      return true;
	    },

	    orderedContent(fieldSpec) {
	      return this.makeContentModelParser(fieldSpec, true);
	    },

	    unorderedContent(fieldSpec) {
	      return this.makeContentModelParser(fieldSpec, false);
	    },

	    string(/* fieldSpec */) {
	      return this.makeSimpleValueParser();
	    },


	    enumType(fieldSpec) {
	      const parser = this.makeSimpleValueParser();

	      if (fieldSpec.bare) {
	        parser.matchValue = function matchValue(myParseState, textLines) {
	          const firstMatch = _.chain(fieldSpec.enumValues)
	              .map((enumValue) => {
	                logger.debug('Attempting to parse as enum property $$$', enumValue);
	                const pattern = `^(.*?)(${enumValue})(?:[\\s.]+|$)`;
	                const re = new RegExp(pattern, this.caseSensitive ? '' : 'i');
	                return textLines[0].match(re);
	              })
	              .compact()
	              .sortBy(match => match[1].length)
	              .first()
	              .value();


	          if (firstMatch) {
	            logger.debug('Finished trying to parse as enum property, match: $$$', firstMatch);
	            myParseState.text = firstMatch[2];
	            myParseState.forPrevious = firstMatch[1];
	            textLines[0] = textLines[0].slice(firstMatch.index + firstMatch[0].length);
	            if (!textLines[0]) {
	              textLines.shift();
	            }
	            return true;
	          }
	          return false;
	        };
	      }
	      return parser;
	    },

	    number(fieldSpec) {
	      const parser = this.makeSimpleValueParser();
	      parser.typeConvert = function typeConvert(textValue) {
	        const parts = textValue.split('/');
	        let intVal;
	        if (parts.length > 1) {
	          intVal = parts[0] / parts[1];
	        }
	        else {
	          intVal = parseInt(textValue, 10);
	        }

	        if (_.isNaN(intVal)) {
	          throw new BadValueError(fieldSpec.name, textValue, '[Integer]');
	        }
	        return intVal;
	      };
	      return parser;
	    },


	    ability(/* fieldSpec */) {
	      const parser = this.number();
	      parser.matchValue = function matchValue(parseState, textLines) {
	        if (_.isEmpty(textLines)) {
	          return false;
	        }
	        textLines[0] = textLines[0].trim();

	        const re = new RegExp('^([\\sa-z\\(\\)]*)(\\d+(?:\\s?\\([\\-+\\d]+\\))?)', 'i');
	        logger.debug('Attempting to match value [$$$] against regexp $$$', textLines[0].trim(), re.toString());
	        let match = textLines[0].match(re);

	        if (match) {
	          logger.debug('Successful match $$$', match);
	          parseState.text = match[2];
	          textLines[0] = match[1] + textLines[0].slice(match.index + match[0].length);
	          if (!textLines[0]) {
	            textLines.shift();
	          }
	          return true;
	        }
	        else if (textLines[1]) {
	          // Try and match against the next line in case we have a two line format
	          textLines[1] = textLines[1].trim();
	          match = textLines[1].match(/^(\d+)(?:\s?\([-+\d]+\))?/);
	          if (match) {
	            logger.debug('Successful ability match $$$ on next line - looks like two line format', match);
	            parseState.text = match[1];
	            textLines[1] = textLines[1].slice(match[0].length);
	            if (!textLines[0]) {
	              textLines.shift();
	            }
	            if (!textLines[0]) {
	              textLines.shift();
	            }
	            return true;
	          }
	        }
	        return false;
	      };

	      return parser;
	    },

	    heading(fieldSpec) {
	      fieldSpec.bare = true;
	      const parser = this.makeSimpleValueParser();
	      parser.skipOutput = true;
	      return parser;
	    },

	    makeSimpleValueParser() {
	      const module = this;
	      return {
	        parse(stateManager, textLines) {
	          const parseState = stateManager.enterChildParser(this);
	          const match = this.matchParseToken(parseState, textLines) &&
	              this.matchValue(parseState, textLines);
	          if (match) {
	            stateManager.completeCurrentStack(parseState.forPrevious);
	            delete parseState.forPrevious;
	            stateManager.leaveChildParser(this, parseState);
	          }
	          else {
	            stateManager.leaveChildParser(this);
	          }
	          return match;
	        },
	        complete(parseState, finalText) {
	          parseState.text += finalText || '';
	          if (parseState.text) {
	            parseState.value = this.extractValue(parseState.text);
	            parseState.value = this.typeConvert(parseState.value);
	            parseState.setOutputValue();
	          }
	        },
	        extractValue(text) {
	          text = text.trim();
	          if (this.pattern && !this.bare) {
	            const regExp = new RegExp(this.pattern, this.caseSensitive ? '' : 'i');
	            const match = text.match(regExp);
	            if (match) {
	              const matchGroup = this.matchGroup || 0;
	              return match[matchGroup];
	            }

	            throw new BadValueError(this.name, text, regExp);
	          }
	          else {
	            return text;
	          }
	        },
	        typeConvert(textValue) {
	          return textValue;
	        },
	        resumeParse(stateManager, textLines) {
	          if (_.isEmpty(textLines)) {
	            return false;
	          }
	          const parseState = stateManager.enterChildParser(this, true);
	          parseState.text += `${textLines.shift()}\n`;
	          stateManager.leaveChildParser(this, parseState);
	          return true;
	        },
	        matchParseToken: module.matchParseToken,
	        matchValue: module.matchValue,
	      };
	    },

	    makeBaseParseState(skipOutput, propertyPath, outputObject, completedObjects) {
	      return {
	        text: '',
	        getObjectValue() {
	          let value = outputObject;
	          const segments = _.clone(propertyPath);
	          while (segments.length) {
	            const prop = segments.shift();
	            if (prop.flatten) {
	              continue;
	            }
	            value = value[prop.name];
	            if (_.isArray(value)) {
	              value = _.last(value);
	            }
	          }
	          return value;
	        },
	        setOutputValue() {
	          if (skipOutput) {
	            return;
	          }
	          let outputTo = outputObject;
	          const segments = _.clone(propertyPath);
	          while (segments.length > 0) {
	            const prop = segments.shift();
	            if (prop.flatten) {
	              continue;
	            }

	            let currentValue = outputTo[prop.name];
	            let newValue = segments.length === 0 ? this.value : {};

	            if (_.isUndefined(currentValue) && prop.allowed > 1) {
	              currentValue = [];
	              outputTo[prop.name] = currentValue;
	            }

	            if (_.isArray(currentValue)) {
	              let arrayItem = _.find(currentValue, _.partial(_.negate(_.contains), completedObjects));
	              if (!arrayItem || (typeof arrayItem === 'string')) {
	                currentValue.push(newValue);
	                arrayItem = _.last(currentValue);
	              }
	              newValue = arrayItem;
	            }
	            else if (_.isUndefined(currentValue)) {
	              outputTo[prop.name] = newValue;
	            }
	            else if (segments.length === 0) {
	              throw new Error('Simple value property somehow already had value when we came to set it');
	            }
	            else {
	              newValue = currentValue;
	            }

	            outputTo = newValue;
	          }
	        },
	        logWrap: `parseState[${_.pluck(propertyPath, 'name').join('/')}]`,
	        toJSON() {
	          return _.extend(_.clone(this), { propertyPath });
	        },
	      };
	    },

	    makeParseStateManager() {
	      const incompleteParserStack = [];
	      const currentPropertyPath = [];
	      const completedObjects = [];
	      const module = this;
	      return {
	        outputObject: {},
	        leaveChildParser(parser, state) {
	          currentPropertyPath.pop();
	          if (state) {
	            state.resumeParser = _.isEmpty(incompleteParserStack) ? null : _.last(incompleteParserStack).parser;
	            incompleteParserStack.push({ parser, state });
	          }
	        },
	        completeCurrentStack(finalText) {
	          while (!_.isEmpty(incompleteParserStack)) {
	            const incomplete = incompleteParserStack.shift();
	            incomplete.parser.complete(incomplete.state, finalText);
	            const value = incomplete.state.getObjectValue();
	            if (_.isObject(value) && !incomplete.parser.flatten) {
	              // Crude but this list is unlikely to get that big
	              completedObjects.push(value);
	            }
	          }
	        },
	        enterChildParser(parser, resume) {
	          currentPropertyPath.push({
	            name: parser.name,
	            allowed: parser.allowed,
	            flatten: parser.flatten,
	          });

	          if (!resume || _.isEmpty(incompleteParserStack) || parser !== _.last(incompleteParserStack).parser) {
	            return module.makeBaseParseState(parser.skipOutput, _.clone(currentPropertyPath), this.outputObject,
	                completedObjects);
	          }

	          return incompleteParserStack.pop().state;
	        },
	        logWrap: 'parserState',
	        toJSON() {
	          return _.extend(_.clone(this), {
	            incompleteParsers: incompleteParserStack,
	            propertyPath: currentPropertyPath,
	          });
	        },
	      };
	    },

	    parserId: 0,
	    parserAttributes: [
	      'forPreviousMatchGroup', 'forNextMatchGroup',
	      'parseToken', 'flatten', 'pattern', 'matchGroup', 'bare', 'caseSensitive',
	      'name', 'skipOutput',
	    ],
	    getParserFor(fieldSpec) {
	      logger.debug('Making parser for field $$$', fieldSpec);
	      const parserBuilder = this[fieldSpec.type];
	      if (!parserBuilder) {
	        throw new Error(`Can't make parser for type ${fieldSpec.type}`);
	      }
	      const parser = parserBuilder.call(this, fieldSpec);
	      parser.required = _.isUndefined(fieldSpec.minOccurs) ? 1 : fieldSpec.minOccurs;
	      parser.allowed = _.isUndefined(fieldSpec.maxOccurs) ? 1 : fieldSpec.maxOccurs;
	      _.extend(parser, _.pick(fieldSpec, this.parserAttributes));
	      _.defaults(parser, {
	        parseToken: parser.name,
	      });
	      parser.id = this.parserId++;
	      parser.logWrap = `parser[${parser.name}]`;
	      return parser;
	    },


	    makeParserList(contentModelArray) {
	      const module = this;
	      return _.chain(contentModelArray)
	          .reject('noParse')
	          .reduce((parsers, fieldSpec) => {
	            parsers.push(module.getParserFor(fieldSpec));
	            return parsers;
	          }, [])
	          .value();
	    },

	    logWrap: 'parseModule',
	  };

	  logger.wrapModule(parserModule);

	  const parser = parserModule.getParserFor(formatSpec);
	  return {
	    parse(text) {
	      logger.debug('Text: $$$', text);
	      logger.debug(parser);

	      const result = {
	        version: formatSpec.formatVersion,
	        monsters: [],
	      };

	      text.split('**********\n').forEach((statblock) => {
	        const textLines = _.chain(statblock.split('\n'))
	            .invoke('trim')
	            .compact()
	            .value();
	        const stateManager = parserModule.makeParseStateManager();
	        let success = false;
	        try {
	          success = parser.parse(stateManager, textLines);
	          while (success && !_.isEmpty(textLines)) {
	            success = parser.resumeParse(stateManager, textLines);
	          }
	          stateManager.completeCurrentStack(textLines.join('\n'));
	        }
	        catch (e) {
	          e.statblock = statblock;
	          throw e;
	        }


	        if (success && textLines.length === 0) {
	          logger.info(stateManager.outputObject);
	          result.monsters.push(stateManager.outputObject.monsters[0]);
	        }
	      });

	      return result;
	    },
	  };
	}

	/**
	 * @constructor
	 */
	function ParserError(message) {
	  // noinspection JSUnusedGlobalSymbols
	  this.message = message;
	}
	ParserError.prototype = new Error();

	/**
	 * @constructor
	 */
	function MissingContentError(missingFieldParsers) {
	  this.missingFieldParsers = missingFieldParsers;
	  this.message = '<ul>';
	  this.message += _.reduce(this.missingFieldParsers, (memo, parser) =>
	          `${memo}<li>Field ${parser.parseToken} should have appeared ${parser.required} more times</li>`
	      , '');
	  this.message += '</ul>';
	}
	MissingContentError.prototype = new ParserError();

	/**
	 * @constructor
	 */
	function BadValueError(name, value, pattern) {
	  this.name = name;
	  this.value = value;
	  this.pattern = pattern;
	  // noinspection JSUnusedGlobalSymbols
	  this.message = `Bad value [${this.value}] for field [${this.name}]. Should have matched pattern: ${this.pattern}`;
	}
	BadValueError.prototype = new ParserError();

	module.exports = {
	  getParser,
	  MissingContentError,
	  BadValueError,
	  ParserError,
	};


/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = {
		"formatVersion": "1.0.0",
		"name": "monsters",
		"maxOccurs": "Infinity",
		"type": "orderedContent",
		"bare": true,
		"contentModel": [
			{
				"name": "coreInfo",
				"type": "orderedContent",
				"flatten": true,
				"contentModel": [
					{
						"name": "name",
						"type": "string",
						"bare": "true"
					},
					{
						"name": "size",
						"enumValues": [
							"Tiny",
							"Small",
							"Medium",
							"Large",
							"Huge",
							"Gargantuan"
						],
						"type": "enumType",
						"bare": "true"
					},
					{
						"name": "type",
						"type": "string",
						"bare": "true",
						"pattern": "^([\\w\\s\\(\\),-]+),",
						"matchGroup": 1
					},
					{
						"name": "alignment",
						"type": "enumType",
						"enumValues": [
							"(?:lawful|neutral|chaotic) (?:good|neutral|evil)(?:\\s?\\(\\d+%\\))? or (?:lawful|neutral|chaotic) (?:good|neutral|evil)(?:\\s?\\(\\d+%\\))?",
							"lawful good",
							"lawful neutral",
							"lawful evil",
							"neutral good",
							"neutral evil",
							"neutral",
							"chaotic good",
							"chaotic neutral",
							"chaotic evil",
							"chaotic",
							"lawful",
							"good",
							"evil",
							"unaligned",
							"any alignment",
							"any good alignment",
							"any non-good alignment",
							"any evil alignment",
							"any non-evil alignment",
							"any lawful alignment",
							"any non-lawful alignment",
							"any chaotic alignment",
							"any non-chaotic alignment",
							"construct"
						],
						"bare": true
					}
				]
			},
			{
				"name": "attributes",
				"type": "unorderedContent",
				"flatten": true,
				"contentModel": [
					{
						"name": "AC",
						"parseToken": "armor class",
						"pattern": "\\d+\\s*(?:\\([^)]*\\))?",
						"type": "string"
					},
					{
						"name": "HP",
						"parseToken": "hit points",
						"type": "string",
						"pattern": "\\d+(?:\\s?\\(\\s?\\d+d\\d+(?:\\s?[-+]\\s?\\d+)?\\s?\\))?"
					},
					{
						"name": "speed",
						"minOccurs": 0,
						"type": "string"
					},
					{
						"name": "strength",
						"parseToken": "str",
						"type": "ability"
					},
					{
						"name": "dexterity",
						"parseToken": "dex",
						"type": "ability"
					},
					{
						"name": "constitution",
						"parseToken": "con",
						"type": "ability"
					},
					{
						"name": "intelligence",
						"parseToken": "int",
						"type": "ability"
					},
					{
						"name": "wisdom",
						"parseToken": "wis",
						"type": "ability"
					},
					{
						"name": "charisma",
						"parseToken": "cha",
						"type": "ability"
					},
					{
						"name": "savingThrows",
						"minOccurs": 0,
						"parseToken": "saving throws",
						"type": "string",
						"pattern": "(?:(?:^|,\\s*)(?:Str|Dex|Con|Int|Wis|Cha)\\s+[\\-\\+]\\d+)+"
					},
					{
						"name": "skills",
						"minOccurs": 0,
						"type": "string",
						"pattern": "(?:(?:^|,\\s*)(?:Acrobatics|Animal Handling|Arcana|Athletics|Deception|History|Insight|Intimidation|Investigation|Medicine|Nature|Perception|Performance|Persuasion|Religion|Sleight of Hand|Stealth|Survival|Influence|Society)\\s+[\\-\\+]\\d+)+"
					},
					{
						"minOccurs": 0,
						"type": "string",
						"name": "damageVulnerabilities",
						"parseToken": "damage vulnerabilities"
					},
					{
						"minOccurs": 0,
						"type": "string",
						"name": "damageResistances",
						"parseToken": "damage resistances"
					},
					{
						"minOccurs": 0,
						"type": "string",
						"name": "damageImmunities",
						"parseToken": "damage immunities"
					},
					{
						"minOccurs": 0,
						"type": "string",
						"name": "conditionImmunities",
						"parseToken": "condition immunities"
					},
					{
						"name": "senses",
						"type": "string",
						"minOccurs": 0
					},
					{
						"name": "passivePerception",
						"parseToken": ",?\\s*passive Perception",
						"minOccurs": 0,
						"type": "number",
						"skipOutput": true
					},
					{
						"name": "spells",
						"minOccurs": 0,
						"type": "string"
					},
					{
						"name": "languages",
						"minOccurs": 0,
						"type": "string"
					}
				]
			},
			{
				"name": "challenge",
				"type": "string",
				"pattern": "^\\s*(\\d+(?:\\s*\\/\\s*\\d)?)\\s*(?:\\(\\s*[\\d,]+\\s*XP\\s*\\)\\s*)?$",
				"matchGroup": 1
			},
			{
				"name": "traitSection",
				"type": "orderedContent",
				"minOccurs": 0,
				"maxOccurs": 1,
				"flatten": true,
				"contentModel": [
					{
						"name": "traits",
						"type": "orderedContent",
						"minOccurs": 1,
						"maxOccurs": "Infinity",
						"contentModel": [
							{
								"name": "name",
								"type": "string",
								"pattern": "(^|.*?[a-z0-9]\\.\\s?)((?:[A-Z0-9][\\w\\-']+[,:!]?|A)(?:\\s(?:[A-Z0-9][\\w\\-']+[,:!]?|of|to|in|the|with|and|or|a|by|for)+)*(?:\\s?\\((?!Recharge|\\d+)[^\\)]+\\))?)(\\s?\\([^\\)]+\\))?\\.(?!$)",
								"matchGroup": 2,
								"forPreviousMatchGroup": 1,
								"forNextMatchGroup": 3,
								"bare": true,
								"caseSensitive": true
							},
							{
								"name": "recharge",
								"type": "string",
								"pattern": "^\\(([^\\)]+)\\)",
								"bare": true,
								"matchGroup": 1,
								"minOccurs": 0
							},
							{
								"name": "text",
								"bare": true,
								"type": "string"
							}
						]
					}
				]
			},
			{
				"name": "actionSection",
				"type": "orderedContent",
				"minOccurs": 0,
				"maxOccurs": 1,
				"flatten": true,
				"contentModel": [
					{
						"name": "actionHeader",
						"type": "heading",
						"bare": true,
						"pattern": "^Actions$"
					},
					{
						"name": "actions",
						"type": "orderedContent",
						"minOccurs": 1,
						"maxOccurs": "Infinity",
						"contentModel": [
							{
								"name": "name",
								"type": "string",
								"pattern": "(^|.*?[a-z]\\.\\s?)((?:\\d+\\.\\s?)?(?:[A-Z][\\w\\-']+[,:!]?|A|\\+\\d)(?:\\s(?:[A-Z][\\w\\-']+[,:!]?|of|in|to|with|the|and|or|by|for|a|\\+\\d+|2hd)+)*(?:\\s?\\((?!Recharge|\\d+)[^\\)]+\\))?)(\\s?\\([^\\)]+\\))?\\.(?!$)",
								"matchGroup": 2,
								"forPreviousMatchGroup": 1,
								"forNextMatchGroup": 3,
								"bare": true,
								"caseSensitive": true
							},
							{
								"name": "recharge",
								"type": "string",
								"bare": true,
								"pattern": "^\\(([^\\)]+)\\)",
								"matchGroup": 1,
								"minOccurs": 0
							},
							{
								"name": "text",
								"bare": true,
								"type": "string"
							}
						]
					}
				]
			},
			{
				"name": "reactionSection",
				"type": "orderedContent",
				"minOccurs": 0,
				"maxOccurs": 1,
				"flatten": true,
				"contentModel": [
					{
						"name": "reactionHeader",
						"type": "heading",
						"bare": true,
						"pattern": "^Reactions$"
					},
					{
						"name": "reactions",
						"type": "orderedContent",
						"minOccurs": 1,
						"maxOccurs": "Infinity",
						"contentModel": [
							{
								"name": "name",
								"type": "string",
								"pattern": "(^|.*?[a-z]\\.\\s?)((?:[A-Z][\\w\\-']+[,:!]?|A)(?:\\s(?:[A-Z][\\w\\-']+[,:!]?|of|in|to|with|the|and|or|a)+)*(?:\\s?\\((?!Recharge|\\d+)[^\\)]+\\))?)(\\s?\\([^\\)]+\\))?\\.(?!$)",
								"matchGroup": 2,
								"forPreviousMatchGroup": 1,
								"forNextMatchGroup": 3,
								"bare": true,
								"caseSensitive": true
							},
							{
								"name": "recharge",
								"type": "string",
								"bare": true,
								"pattern": "^\\(([^\\)]+)\\)",
								"matchGroup": 1,
								"minOccurs": 0
							},
							{
								"name": "text",
								"bare": true,
								"type": "string"
							}
						]
					}
				]
			},
			{
				"name": "legendaryActionSection",
				"type": "orderedContent",
				"minOccurs": 0,
				"maxOccurs": 1,
				"flatten": true,
				"contentModel": [
					{
						"name": "actionHeader",
						"type": "heading",
						"bare": true,
						"pattern": "^Legendary Actions$"
					},
					{
						"name": "legendaryPoints",
						"type": "number",
						"bare": true,
						"pattern": "^(?:The)?[ \\w-]+(?:can|may) take (\\d+) legendary action(?:s)?.*?start.*?turn[.]?",
						"matchGroup": 1
					},
					{
						"name": "legendaryActions",
						"type": "orderedContent",
						"minOccurs": 1,
						"maxOccurs": "Infinity",
						"contentModel": [
							{
								"name": "name",
								"type": "string",
								"bare": true,
								"pattern": "(^|.*?[a-z]\\.\\s?)((?:[A-Z][\\w\\-']+[,:!]?|A)(?:\\s(?:[A-Z][\\w\\-']+[,:!]?|of|with|to|the|and|or|a)+)*)(\\s?\\([^\\)]+\\))?\\.(?!$)",
								"matchGroup": 2,
								"forPreviousMatchGroup": 1,
								"forNextMatchGroup": 3,
								"caseSensitive": true
							},
							{
								"name": "cost",
								"type": "number",
								"bare": true,
								"pattern": "^\\s*\\(\\s*(?:costs )?(\\d+) actions\\s*\\)",
								"matchGroup": 1,
								"minOccurs": 0
							},
							{
								"name": "text",
								"bare": true,
								"type": "string"
							}
						]
					}
				]
			},
			{
				"name": "lairActionSection",
				"type": "orderedContent",
				"minOccurs": 0,
				"maxOccurs": 1,
				"flatten": true,
				"contentModel": [
					{
						"name": "actionHeader",
						"type": "heading",
						"pattern": "^Lair Actions$"
					},
					{
						"name": "lairActionBlurb",
						"type": "heading",
						"pattern": "^On initiative count 20[^:]+:*$"
					},
					{
						"name": "lairActions",
						"type": "string",
						"bare": true,
						"pattern": "^(?:\\*|•)\\s?((?:.|\n)*)",
						"matchGroup": 1,
						"minOccurs": 1,
						"maxOccurs": "Infinity"
					}
				]
			},
			{
				"name": "regionalEffectsSection",
				"type": "orderedContent",
				"minOccurs": 0,
				"maxOccurs": 1,
				"flatten": true,
				"contentModel": [
					{
						"name": "actionHeader",
						"type": "heading",
						"pattern": "^Regional Effects$"
					},
					{
						"name": "regionalBlurb",
						"type": "heading",
						"minOccurs": 0,
						"pattern": "^The region (?:containing|around|surrounding)[^:]+:$"
					},
					{
						"name": "regionalEffects",
						"type": "string",
						"minOccurs": 1,
						"maxOccurs": "Infinity",
						"bare": true,
						"pattern": "^(?:\\*|•)\\s?((?:.|\n)*)",
						"matchGroup": 1
					},
					{
						"name": "regionalEffectsFade",
						"type": "string",
						"bare": true,
						"pattern": "^(?:if|when)[\\w\\s-]+(?:dies|is destroyed).*$"
					}
				]
			}
		]
	};

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);

	function stringify(object) {
	  if (object === undefined) {
	    return object;
	  }

	  return typeof object === 'string' ? object : JSON.stringify(object, (key, value) =>
	    (key !== 'logWrap' && key !== 'isLogWrapped' ? value : undefined)
	  );
	}

	function wrapFunctions(object, moduleName, makeWrapper) {
	  const funcs = getAllFuncs(object);
	  return _.each(funcs, funcName => (object[funcName] = makeWrapper(funcName, object[funcName], moduleName)));
	}

	function getAllFuncs(obj) {
	  let props = [];
	  let current = obj;
	  do {
	    props = props.concat(Object.getOwnPropertyNames(current));
	  } while ((current = Object.getPrototypeOf(current)) && current !== Object.prototype);

	  return props.sort().filter((e, i, arr) => (e !== arr[i + 1] && typeof obj[e] === 'function'));
	}

	module.exports = class Logger {
	  constructor(loggerName, roll20) {
	    this.prefixString = '';
	    const state = roll20.getState('roll20-logger');
	    state[loggerName] = state[loggerName] || Logger.levels.INFO;

	    roll20.on('chat:message', (msg) => {
	      if (msg.type === 'api' && msg.content.startsWith('!logLevel')) {
	        const parts = msg.content.split(/\s/);
	        if (parts.length > 2) {
	          if (!state[parts[1]]) {
	            roll20.sendChat('Logger', `Unrecognised logger name ${parts[1]}`);
	            return;
	          }
	          state[parts[1]] = Logger.levels[parts[2].toUpperCase()] || Logger.levels.INFO;
	        }
	      }
	    });

	    function shouldLog(level) {
	      return level <= state[loggerName];
	    }

	    function outputLog(level, message) {
	      if (!shouldLog(level)) {
	        return;
	      }

	      const args = arguments.length > 2 ? _.toArray(arguments).slice(2) : [];
	      let processedMessage = stringify(message);
	      if (processedMessage) {
	        processedMessage = processedMessage.replace(/\$\$\$/g, () => stringify(args.shift()));
	      }
	      // noinspection NodeModulesDependencies
	      roll20.log(`${loggerName} ${Date.now()} ` +
	        `${Logger.getLabel(level)} : ${shouldLog(Logger.levels.TRACE) ? this.prefixString : ''}` +
	        `${processedMessage}`);
	    }

	    _.each(Logger.levels, (level, levelName) => {
	      this[levelName.toLowerCase()] = _.partial(outputLog, level);
	    });

	    this.wrapModule = function wrapModule(modToWrap) {
	      if (shouldLog(Logger.levels.TRACE)) {
	        wrapFunctions(modToWrap, modToWrap.logWrap, this.wrapFunction.bind(this));
	        modToWrap.isLogWrapped = true;
	      }
	      return modToWrap;
	    };

	    this.getLogLevel = function getLogLevel() {
	      return state[loggerName] || Logger.levels.INFO;
	    };

	    this.setLogLevel = function setLogLevel(level) {
	      if (typeof level === 'string') {
	        level = Logger.levels[level.toUpperCase()];
	      }
	      if (typeof level === 'number' && level >= Logger.levels.OFF && level <= Logger.levels.TRACE) {
	        state[loggerName] = level;
	      }
	    };

	    this.getLogTap = function getLogTap(level, messageString) {
	      return _.partial(outputLog, level, messageString);
	    };

	    this.wrapFunction = function wrapFunction(name, func, moduleName) {
	      if (shouldLog(Logger.levels.TRACE)) {
	        if (name === 'toJSON' || moduleName === 'roll20' && name === 'log') {
	          return func;
	        }
	        const logger = this;
	        return function functionWrapper() {
	          logger.trace('$$$.$$$ starting with this value: $$$ and args $$$', moduleName, name, this, arguments);
	          logger.prefixString = `${logger.prefixString}  `;
	          const retVal = func.apply(this, arguments);
	          logger.prefixString = logger.prefixString.slice(0, -2);
	          logger.trace('$$$.$$$ ending with return value $$$', moduleName, name, retVal);
	          if (retVal && retVal.logWrap && !retVal.isLogWrapped) {
	            logger.wrapModule(retVal);
	          }
	          return retVal;
	        };
	      }
	      return func;
	    };
	  }

	  static getLabel(logLevel) {
	    const logPair = _.chain(Logger.levels).pairs().find(pair => pair[1] === logLevel).value();
	    return logPair ? logPair[0] : 'UNKNOWN';
	  }

	  static get levels() {
	    return {
	      OFF: 0,
	      ERROR: 1,
	      WARN: 2,
	      INFO: 3,
	      DEBUG: 4,
	      TRACE: 5,
	    };
	  }
	};


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);
	const utils = __webpack_require__(7);


	module.exports = class EntityLookup {
	  constructor() {
	    this.entities = {};
	    this.noWhiteSpaceEntities = {};
	    this.entityProcessors = {};
	    this.versionCheckers = {};
	    this.processedEntityGroupNames = [];
	    this.deferredEntityGroups = [];
	    this.lastEntityLoadTime = 0;
	  }


	  configureEntity(entityName, processors, versionChecker) {
	    this.entities[entityName] = {};
	    this.noWhiteSpaceEntities[entityName] = {};
	    this.entityProcessors[entityName] = processors || [];
	    this.versionCheckers[entityName] = versionChecker || _.constant(true);
	  }

	  addEntities(entitiesObject, resultReporter) {
	    try {
	      entitiesObject.name = entitiesObject.name || 'unnamed';
	      const results = {
	        errors: [],
	        entityGroupName: entitiesObject.name,
	      };

	      if (entitiesObject.dependencies && !_.isEmpty(entitiesObject.dependencies)) {
	        if (typeof entitiesObject.dependencies === 'string') {
	          entitiesObject.dependencies = entitiesObject.dependencies.split(/,/)
	              .map(Function.prototype.call, String.prototype.trim);
	        }
	        if (!_.isEmpty(_.difference(entitiesObject.dependencies, this.processedEntityGroupNames))) {
	          this.deferredEntityGroups.push(entitiesObject);
	          _.delay(this.checkForUnresolvedDependencies.bind(this), 10000, resultReporter);
	          return;
	        }
	      }

	      _.chain(entitiesObject)
	          .omit('version', 'patch', 'name', 'dependencies')
	          .each((entityArray, type) => {
	            results[type] = {
	              withErrors: [],
	              skipped: [],
	              deleted: [],
	              patched: [],
	              added: [],
	            };

	            if (!this.entities[type]) {
	              results.errors.push({ entity: 'general', errors: [`Unrecognised entity type ${type}`] });
	              return;
	            }

	            if (!this.versionCheckers[type](entitiesObject.version, results.errors)) {
	              return;
	            }


	            _.each(entityArray, (entity) => {
	              let key = entity.name.toLowerCase();
	              let operation = this.entities[type][key] ? (entitiesObject.patch ? 'patched' : 'skipped') : 'added';

	              if (operation === 'patched') {
	                entity = patchEntity(this.entities[type][key], entity);
	                if (!entity) {
	                  operation = 'deleted';
	                  delete this.entities[type][key];
	                  delete this.noWhiteSpaceEntities[type][key.replace(/\s+/g, '')];
	                }
	              }

	              if (_.contains(['patched', 'added'], operation)) {
	                const processed = _.reduce(this.entityProcessors[type], utils.executor, {
	                  entity,
	                  type,
	                  version: entitiesObject.version,
	                  errors: [],
	                });
	                if (!_.isEmpty(processed.errors)) {
	                  processed.entity = processed.entity.name;
	                  results.errors.push(processed);
	                  operation = 'withErrors';
	                }
	                else {
	                  if (processed.entity.name.toLowerCase() !== key) {
	                    results[type].deleted.push(key);
	                    delete this.entities[type][key];
	                    delete this.noWhiteSpaceEntities[type][key.replace(/\s+/g, '')];
	                    key = processed.entity.name.toLowerCase();
	                  }
	                  this.entities[type][key] = processed.entity;
	                  this.noWhiteSpaceEntities[type][key.replace(/\s+/g, '')] = processed.entity;
	                }
	              }


	              results[type][operation].push(key);
	            });
	          });

	      this.processedEntityGroupNames.push(entitiesObject.name);
	      if (resultReporter) {
	        resultReporter.report(results);
	      }
	      this.deferredEntityGroups = _.without(this.deferredEntityGroups, entitiesObject);
	      this.checkForUnresolvedDependencies(resultReporter);
	    }
	    finally {
	      this.lastEntityLoadTime = Date.now();
	    }
	  }

	  checkForUnresolvedDependencies(resultReporter) {
	    this.deferredEntityGroups.forEach((deferred) => {
	      if (_.isEmpty(_.difference(deferred.dependencies, this.processedEntityGroupNames))) {
	        this.addEntities(deferred, resultReporter);
	      }
	    });

	    if (Date.now() - this.lastEntityLoadTime >= 10000) {
	      if (resultReporter) {
	        this.deferredEntityGroups.forEach((deferred) => {
	          const missingDeps = _.difference(deferred.dependencies, this.processedEntityGroupNames);
	          resultReporter.report({
	            errors: [{
	              entity: 'Missing dependencies',
	              errors: [`Entity group is missing dependencies [${missingDeps.join(', ')}]`],
	            }],
	            entityGroupName: deferred.name,
	          });
	        });
	      }
	    }
	    else {
	      _.delay(this.checkForUnresolvedDependencies.bind(this), 10000, resultReporter);
	    }
	  }

	  findEntity(type, name, tryWithoutWhitespace) {
	    const key = name.toLowerCase();
	    if (!this.entities[type]) {
	      throw new Error(`Unrecognised entity type ${type}`);
	    }
	    let found = this.entities[type][key];
	    if (!found && tryWithoutWhitespace) {
	      found = this.noWhiteSpaceEntities[type][key.replace(/\s+/g, '')];
	    }
	    return found && utils.deepClone(found);
	  }

	  searchEntities(type, criteria) {
	    function containsSomeIgnoreCase(array, testValues) {
	      testValues = (_.isArray(testValues) ? testValues : [testValues]).map(s => s.toLowerCase());
	      return !!_.chain(array)
	          .map(s => s.toLowerCase())
	          .intersection(testValues)
	          .value().length;
	    }

	    return _.reduce(criteria, (results, criterionValue, criterionField) => {
	      const re = new RegExp(criterionValue, 'i');
	      const matcher = (entity) => {
	        const value = entity[criterionField];
	        switch (typeof value) {
	          case 'string':
	            return value.match(re);
	          case 'boolean':
	          case 'number':
	            return value === criterionValue;
	          case 'object':
	            return _.isArray(value) && containsSomeIgnoreCase(value, criterionValue);
	          default:
	            return false;
	        }
	      };
	      return results.filter(matcher);
	    }, this.getAll(type));
	  }

	  getAll(type) {
	    if (!this.entities[type]) {
	      throw new Error(`Unrecognised entity type: ${type}`);
	    }
	    return utils.deepClone(_.values(this.entities[type]));
	  }

	  /**
	   * Gets all of the keys for the specified entity type
	   * @param {string} type - The entity type to retrieve keys for (either 'monster' or 'spell')
	   * @param {boolean} sort - True if the returned array should be sorted alphabetically; false otherwise
	   * @function
	   * @public
	   * @name EntityLookup#getKeys
	   * @return {Array} An array containing all keys for the specified entity type
	   */
	  getKeys(type, sort) {
	    if (!this.entities[type]) {
	      throw new Error(`Unrecognised entity type: ${type}`);
	    }
	    const keys = _.keys(this.entities[type]);
	    if (sort) {
	      keys.sort();
	    }
	    return keys;
	  }

	  toJSON() {
	    return { monsterCount: _.size(this.entities.monsters), spellCount: _.size(this.entities.spells) };
	  }

	  get logWrap() {
	    return 'entityLookup';
	  }

	  static jsonValidatorAsEntityProcessor(jsonValidator) {
	    return function jsonValidatorEntityProcessor(entityInfo) {
	      const wrapper = {
	        version: entityInfo.version,
	      };
	      wrapper[entityInfo.type] = [entityInfo.entity];
	      const errors = jsonValidator.validate(wrapper);
	      const flattenedErrors = _.chain(errors).values().flatten().value();
	      entityInfo.errors = entityInfo.errors.concat(flattenedErrors);
	      return entityInfo;
	    };
	  }

	  static jsonValidatorAsVersionChecker(jsonValidator, entityType) {
	    return EntityLookup.getVersionChecker(jsonValidator.getVersionNumber(), entityType);
	  }

	  static getVersionChecker(requiredVersion, entityType) {
	    function pruneToMinor(versionString) {
	      return versionString.split('.', 2).join('.');
	    }

	    return function versionChecker(version, errorsArray) {
	      const prunedVersion = pruneToMinor(version);
	      const prunedRequiredVersion = pruneToMinor(requiredVersion);
	      const valid = prunedVersion === prunedRequiredVersion;
	      if (!valid) {
	        errorsArray.push({
	          entity: 'general',
	          errors: [`Incorrect ${entityType} data format version: [${version}]. Required is: ${requiredVersion}.` +
	          'This probably means you need to download an updated version to be compatible with the latest version of' +
	          ' the Companion Script.'],
	        });
	      }
	      return valid;
	    };
	  }


	};

	function patchEntity(original, patch) {
	  if (patch.remove) {
	    return undefined;
	  }
	  return _.mapObject(original, (propVal, propName) => {
	    if (propName === 'name' && patch.newName) {
	      return patch.newName;
	    }
	    return patch[propName] || propVal;
	  });
	}


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);

	const generateUUID = (function _generateUUID() {
	  let a = 0;
	  const b = [];
	  return function generateUUIDInternal() {
	    let c = (new Date()).getTime();
	    const d = c === a;
	    a = c;
	    const e = new Array(8);
	    let f;
	    for (f = 7; f >= 0; f--) {
	      e[f] = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'.charAt(c % 64);
	      c = Math.floor(c / 64);
	    }
	    c = e.join('');
	    if (d) {
	      for (f = 11; f >= 0 && b[f] === 63; f--) {
	        b[f] = 0;
	      }
	      b[f]++;
	    }
	    else {
	      for (f = 0; f < 12; f++) {
	        b[f] = Math.floor(64 * Math.random());
	      }
	    }
	    for (f = 0; f < 12; f++) {
	      c += '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'.charAt(b[f]);
	    }
	    return c;
	  };
	}());

	// noinspection JSUnusedGlobalSymbols
	module.exports = {
	  deepExtend(original, newValues) {
	    if (!original) {
	      original = _.isArray(newValues) ? [] : {};
	    }
	    _.each(newValues, (value, key) => {
	      if (_.isArray(original[key])) {
	        if (!_.isArray(value)) {
	          original[key].push(value);
	        }
	        else {
	          original[key] = _.map(value, (item, index) => {
	            if (_.isObject(item)) {
	              return this.deepExtend(original[key][index], item);
	            }

	            return item !== undefined ? item : original[key][index];
	          });
	        }
	      }
	      else if (_.isObject(original[key])) {
	        original[key] = this.deepExtend(original[key], value);
	      }
	      else {
	        original[key] = value;
	      }
	    });
	    return original;
	  },

	  createObjectFromPath(pathString, value) {
	    const newObject = {};
	    _.reduce(pathString.split(/\./), (object, pathPart, index, pathParts) => {
	      const match = pathPart.match(/([^.[]*)(?:\[(\d+)])?/);
	      const newVal = index === pathParts.length - 1 ? value : {};

	      if (match[2]) {
	        object[match[1]] = [];
	        object[match[1]][match[2]] = newVal;
	      }
	      else {
	        object[match[1]] = newVal;
	      }
	      return newVal;
	    }, newObject);
	    return newObject;
	  },

	  getObjectFromPath(obj, path) {
	    path = path.replace(/\[(\w+)]/g, '.$1'); // convert indexes to properties
	    path = path.replace(/^\./, '');           // strip a leading dot
	    path.split('.').every(segment => (obj = obj[segment]));
	    return obj;
	  },

	  deepClone(object) {
	    return JSON.parse(JSON.stringify(object));
	  },

	  executor() {
	    switch (arguments.length) {
	      case 0:
	        return undefined;
	      case 1:
	        return arguments[0]();
	      default:
	      // Fall through
	    }
	    const args = Array.apply(null, arguments).slice(2);
	    args.unshift(arguments[0]);
	    return arguments[1].apply(null, args);
	  },

	  /**
	   * Gets a string as 'Title Case' capitalizing the first letter of each word (i.e. 'the grapes of wrath' -> 'The
	   * Grapes Of Wrath')
	   * @param {string} s - The string to be converted
	   * @return {string} the supplied string in title case
	   */
	  toTitleCase(s) {
	    return s.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
	  },

	  toOptionsString(options) {
	    return options.reduce((optionString, option) => {
	      if (_.isObject(option)) {
	        return `${optionString} --${option.name} ${option.value}`;
	      }

	      return `${optionString} --${option}`;
	    }, '');
	  },

	  /**
	   * Calculates a contrasting color using YIQ luma value
	   * @param {string} hexcolor - the color to calculate a contrasting color for
	   * @return {string} either 'white' or 'black' as determined to be the best contrasting text color for the input color
	   */
	  getContrastYIQ(hexcolor) {
	    hexcolor = hexcolor.replace('#', '');
	    if (hexcolor.length === 3) {
	      hexcolor += hexcolor;
	    }
	    const r = parseInt(hexcolor.substr(0, 2), 16);
	    const g = parseInt(hexcolor.substr(2, 2), 16);
	    const b = parseInt(hexcolor.substr(4, 2), 16);
	    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
	    return yiq >= 128 ? 'black' : 'white';
	  },

	  /**
	   * Builds an html element as a string using the specified options
	   * @param {string} tag - the html tag type
	   * @param innerHtml - can be a string to be used as the element inner html, or a {tag, innerHtml, attrs} object
	   *                    in order to build a child html element string
	   * @param attrs - a collection of attributes and their values to be applied to the html element
	   * @return {string} the full html element as a string
	   */
	  buildHTML(tag, innerHtml, attrs) {
	    if (typeof innerHtml === 'object') {
	      innerHtml = _.map(innerHtml, html => html && this.buildHTML(html.tag, html.innerHtml, html.attrs)).join('');
	    }

	    let h = `<${tag}`;
	    h += _.chain(attrs)
	      .map((attrVal, attrName) => attrVal !== false && ` ${attrName}="${attrVal}"`)
	      .compact()
	      .value()
	      .join('');

	    if (innerHtml) {
	      h += `>${innerHtml}</${tag}>`;
	    }
	    else {
	      h += '/>';
	    }

	    return h;
	  },

	  missingParam(name) {
	    throw new Error(`Parameter ${name} is required`);
	  },

	  flattenObject(object) {
	    return _.reduce(object, (explodedProps, propVal, propKey) => {
	      if (_.isObject(propVal)) {
	        return _.extend(explodedProps, this.flattenObject(propVal));
	      }

	      explodedProps[propKey] = propVal;
	      return explodedProps;
	    }, {});
	  },

	  extendWithArrayValues(into, from) {
	    return _.reduce(from, (merged, value, key) => {
	      if (_.isUndefined(value) || value === null || (_.isObject(value) && _.isEmpty(value))) {
	        return merged;
	      }

	      if (_.isUndefined(merged[key])) {
	        merged[key] = value;
	      }
	      else {
	        if (!_.isArray(merged[key])) {
	          merged[key] = [merged[key]];
	        }
	        merged[key] = merged[key].concat(value);
	      }
	      return merged;
	    }, into);
	  },


	  generateRowID() {
	    return generateUUID().replace(/_/g, 'Z');
	  },

	  camelToSnakeCase(string) {
	    return string.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
	  },
	};


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);

	// noinspection JSUnusedGlobalSymbols
	const validatorFactories = {
	  orderedContent(spec) {
	    return makeContentModelValidator(spec);
	  },

	  unorderedContent(spec) {
	    return makeContentModelValidator(spec);
	  },

	  string(spec) {
	    if (spec.pattern) {
	      if (spec.matchGroup) {
	        return regExValidator(spec.name, extractRegexPart(spec.pattern, spec.matchGroup), spec.caseSensitive);
	      }

	      return regExValidator(spec.name, spec.pattern, spec.caseSensitive);
	    }
	    return function noop() {
	    };
	  },

	  enumType(spec) {
	    return function enumValidator(value, errors) {
	      if (!_.some(spec.enumValues, enumVal => new RegExp(`^${enumVal}$`, 'i').test(value))) {
	        errors.add(`Value "${value}" should have been one of [${spec.enumValues.join(',')}]`);
	      }
	    };
	  },

	  ability(spec) {
	    return regExValidator(spec.name, '\\d+');
	  },

	  heading() {
	    // Do not replace with _.noop, these functions get annotated
	    return function noop() {
	    };
	  },

	  number() {
	    return function numberValidator(value, errors) {
	      if (typeof value !== 'number') {
	        errors.add(`Value "${value}" should have been a number`);
	      }
	    };
	  },
	};

	function extractRegexPart(regexp, matchIndex) {
	  let braceCount = 0;
	  let startIndex = _.findIndex(regexp, (character, index) => {
	    if (character === '(' &&
	      (index < 2 || regexp[index - 1] !== '\\') &&
	      regexp[index + 1] !== '?') {
	      return ++braceCount === matchIndex;
	    }
	    return false;
	  });

	  if (startIndex === -1) {
	    throw new Error(`Can't find matchgroup ${matchIndex} in regular expression ${regexp}`);
	  }

	  // Lose the bracket
	  startIndex++;

	  let openCount = 1;
	  const endIndex = _.findIndex(regexp.slice(startIndex), (character, index, regexpPart) => {
	    if (character === '(' && regexpPart[index - 1] !== '\\') {
	      openCount++;
	    }
	    if (character === ')' && regexpPart[index - 1] !== '\\') {
	      return --openCount === 0;
	    }
	    return false;
	  });

	  if (endIndex === -1) {
	    throw new Error(`matchgroup ${matchIndex} seems not to have closing brace in regular expression ${regexp}`);
	  }

	  return regexp.slice(startIndex, startIndex + endIndex);
	}

	function regExValidator(fieldName, regexp, caseSensitive) {
	  const re = new RegExp(`^${regexp}$`, caseSensitive ? undefined : 'i');
	  return function regexpValidate(value, errors) {
	    if (!re.test(value)) {
	      errors.add(`Value "${value}" doesn't match pattern /${regexp}/`);
	    }
	  };
	}

	function makeValidator(spec) {
	  const validator = validatorFactories[spec.type](spec);
	  validator.max = _.isUndefined(spec.maxOccurs) ? 1 : spec.maxOccurs;
	  validator.min = _.isUndefined(spec.minOccurs) ? 1 : spec.minOccurs;
	  validator.fieldName = spec.name;
	  return validator;
	}

	function makeContentModelValidator(spec) {
	  const parts = _.chain(spec.contentModel)
	    .reject({ type: 'heading' })
	    .partition({ flatten: true })
	    .value();
	  const flattened = _.map(parts[0], makeValidator);

	  const subValidators = _.reduce(parts[1], (subVals, field) => {
	    subVals[field.name] = makeValidator(field);
	    return subVals;
	  }, {});

	  return function contentModelValidator(object, errors, isFlatten) {
	    let completed = _.reduce(object, (completedMemo, fieldValue, fieldName) => {
	      const validator = subValidators[fieldName];
	      if (validator) {
	        completedMemo.push(fieldName);
	        errors.pushPath(fieldName);
	        if (_.isArray(fieldValue)) {
	          if (fieldValue.length > validator.max) {
	            errors.add(`Number of entries [${fieldValue.length}] exceeds maximum allowed: ${validator.max}`);
	          }
	          else if (fieldValue.length < validator.min) {
	            errors.add(`Number of entries [${fieldValue.length}] is less than minimum allowed: ${validator.min}`);
	          }
	          else {
	            _.each(fieldValue, (arrayItem, index) => {
	              errors.pushIndex(arrayItem.name ? arrayItem.name : index);
	              validator(arrayItem, errors);
	              errors.popIndex();
	            });
	          }
	        }
	        else {
	          validator(fieldValue, errors);
	        }
	        errors.popPath();
	      }
	      return completedMemo;
	    }, []);

	    let toValidate = _.omit(object, completed);

	    _.chain(flattened)
	      .map((validator) => {
	        const subCompleted = validator(toValidate, errors, true);
	        if (subCompleted.length === 0) {
	          return validator;
	        }

	        completed = completed.concat(subCompleted);
	        toValidate = _.omit(toValidate, completed);
	        return null;
	      })
	      .compact()
	      .each((validator) => {
	        if (validator.min > 0) {
	          errors.pushPath(validator.fieldName);
	          errors.add('Section is missing');
	          errors.popPath();
	        }
	      });

	    // If we're a flattened validator (our content is injected directly into the parent content model)
	    // Then we should only report missing fields if there was some match in our content model - otherwise
	    // the parent content model will check the cardinality of this model as a whole
	    if (!isFlatten || !_.isEmpty(completed)) {
	      _.chain(subValidators)
	        .omit(completed)
	        .each((validator) => {
	          if (validator.min > 0) {
	            errors.pushPath(validator.fieldName);
	            errors.add('Field is missing');
	            errors.popPath();
	          }
	        });
	    }

	    // Flattened content models shouldn't check for unrecognised fields since they're only parsing
	    // part of the current content model.
	    if (!isFlatten) {
	      _.chain(object)
	        .omit(completed)
	        .each((value, key) => {
	          errors.pushPath(key);
	          errors.add('Unrecognised field');
	          errors.popPath();
	        });
	    }


	    return completed;
	  };
	}

	class Errors {
	  constructor() {
	    this.errors = [];
	    this.currentPath = [];
	  }

	  pushPath(path) {
	    this.currentPath.push(path);
	  }

	  popPath() {
	    return this.currentPath.pop();
	  }

	  pushIndex(index) {
	    this.currentPath[this.currentPath.length - 1] = `${this.currentPath[this.currentPath.length - 1]}[${index}]`;
	  }

	  popIndex() {
	    this.currentPath[this.currentPath.length - 1] = this.currentPath[this.currentPath.length -
	    1].replace(/\[[^\]]+\]/, '');
	  }

	  add(msg) {
	    this.errors.push({ msg, path: _.clone(this.currentPath) });
	  }

	  getErrors() {
	    return _.chain(this.errors)
	      .groupBy(error => error.path[0])
	      .mapObject(errorList =>
	        _.map(errorList, error => `${error.path.slice(1).join('.')}: ${error.msg}`)
	      )
	      .value();
	  }
	}

	module.exports = class JSONValidator {
	  constructor(spec) {
	    this.versionProp = {
	      type: 'string',
	      name: 'version',
	    };
	    this.spec = spec;
	    this.contentValidator = makeValidator({ type: 'unorderedContent', contentModel: [spec, this.versionProp] });
	  }

	  validate(object) {
	    const errors = new Errors();
	    this.contentValidator(object, errors);
	    return errors.getErrors();
	  }

	  getVersionNumber() {
	    return this.spec.formatVersion;
	  }
	};


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);

	module.exports = class EntityLookupResultReporter {

	  constructor(logger, reporter) {
	    this.report = function report(result) {
	      const summary = _.mapObject(result, (resultObject, type) => {
	        if (type === 'errors') {
	          return resultObject.length;
	        }

	        return _.mapObject(resultObject, operationResultArray => operationResultArray.length);
	      });
	      logger.info('Summary of adding $$$ entity group to the lookup: $$$', result.entityGroupName, summary);
	      logger.debug('Details: $$$', result);
	      if (!_.isEmpty(result.errors)) {
	        const message = _.chain(result.errors)
	            .groupBy('entity')
	            .mapObject(entityErrors =>
	                _.chain(entityErrors)
	                    .pluck('errors')
	                    .flatten()
	                    .value()
	            )
	            .map((errors, entityName) => `<li>${entityName}:<ul><li>${errors.join('</li><li>')}</li></ul></li>`)
	            .value();

	        reporter.reportError(`JSON import error for ${result.entityGroupName} entity group:<ul>${message}</ul>`);
	      }
	    };
	  }
	};


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);

	function makeNormalMessage(heading, text) {
	  return `&{template:5e-shaped} {{title=${heading}}}{{content=${text}}}`;
	}

	function makeErrorMessage(scriptName, text) {
	  return makeNormalMessage(`${scriptName} Error`, text);
	}

	function makeStreamHeader(heading) {
	  return '<div style="border-top:thin solid black; border-left: thin solid black; bottom: -7px;' +
	    'border-right: thin solid black; background-color:white; position: relative; left:-20px; padding: 5px;"><div ' +
	    'style="font-weight:bold;border-bottom:1px solid black;font-size: 130%;padding-bottom:5px;">' +
	    `${heading}</div>` +
	    '<div style="border-left: thin solid black; border-right: thin solid black; background-color:white; ' +
	    'position: absolute; left:-1px; bottom: -27px; height:27px; width:100%; z-index:1;font-weight:bold;' +
	    'font-size:200%;"></div></div>';
	}

	function makeStreamBody(text) {
	  return '<div style="border-left: thin solid black; border-right: thin solid black; background-color:white; ' +
	    `position: relative; left:-20px; padding-left: 5px; padding-right:5px;">${text}` +
	    '<div style="border-left: thin solid black; border-right: thin solid black; background-color:white; ' +
	    'position: absolute; left:-1px; bottom: -33px; height:33px; width:100%; z-index:1;font-weight:bold;' +
	    'font-size:200%;"><div style="padding-left:10px;">. . .</div></div></div>';
	}

	function makeStreamFooter() {
	  return '<div style="border-bottom: thin solid black; border-left: thin solid black; border-right: thin solid black;' +
	    'background-color:white; position: relative; left:-20px; padding: 5px;"></div>';
	}

	class Reporter {

	  constructor(roll20, scriptName) {
	    this.roll20 = roll20;
	    this.scriptName = scriptName;
	  }

	  setPlayer(playerId) {
	    this.playerId = playerId;
	  }

	  reportPublic(heading, text) {
	    this.roll20.sendChat('', `${makeNormalMessage(heading, text)}`);
	  }

	  reportPlayer(heading, text) {
	    this.roll20.sendChat('', `/w ${this.getPlayerName()} ${makeNormalMessage(heading, text)}`, null,
	      { noarchive: true });
	  }

	  reportError(text) {
	    this.roll20.sendChat('', `/w ${this.getPlayerName()} ${makeErrorMessage(this.scriptName, text)}`, null,
	      { noarchive: true });
	  }

	  getPlayerName() {
	    return this.playerId ? `"${this.roll20.getObj('player', this.playerId).get('displayname')}"` : 'gm';
	  }

	  getMessageBuilder(heading, isPublic) {
	    const fields = {};
	    const reporter = this;
	    return {
	      addField(name, content) {
	        fields[name] = content;
	      },
	      display() {
	        const displayer = (isPublic ? reporter.reportPublic : reporter.reportPlayer).bind(reporter);
	        displayer(heading, _.reduce(fields, (text, content, name) => `${text}{{${name}=${content}}}`, ''));
	      },
	    };
	  }

	  getMessageStreamer(heading) {
	    const sendChat = (text) => {
	      this.roll20.sendChat('', `/w ${this.getPlayerName()} ${text}`, null, { noarchive: true });
	    };

	    sendChat(makeStreamHeader(heading));
	    return {
	      stream(message) {
	        sendChat(makeStreamBody(message));
	      },
	      finish() {
	        sendChat(makeStreamFooter());
	      },
	    };
	  }
	}


	module.exports = Reporter;


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);
	const parseModule = __webpack_require__(3);
	const makeCommandProc = __webpack_require__(12);
	const UserError = __webpack_require__(13);
	const Migrator = __webpack_require__(15);
	// Modules
	const AbilityMaker = __webpack_require__(16);
	const ConfigUI = __webpack_require__(18);
	const AdvantageTracker = __webpack_require__(19);
	const RestManager = __webpack_require__(20);
	const UsesManager = __webpack_require__(21);
	const AmmoManager = __webpack_require__(22);
	const Importer = __webpack_require__(23);
	const srdConverter = __webpack_require__(25);

	/**
	 * @typedef {Object} ChatMessage
	 * @property {string} content
	 * @property {string} type
	 * @property {SelectedItem[]} selected
	 * @property {string} rolltemplate
	 */


	/**
	 *
	 * @typedef {Object} SelectedItem
	 * @property {string} _id
	 * @property (string _type
	 */


	module.exports = ShapedScripts;

	function ShapedScripts(logger, myState, roll20, parser, entityLookup, reporter) {
	  let addedTokenIds = [];
	  const reportPublic = reporter.reportPublic.bind(reporter);
	  const reportError = reporter.reportError.bind(reporter);
	  const errorHandler = function errorHandler(e) {
	    if (typeof e === 'string' || e instanceof parseModule.ParserError || e instanceof UserError) {
	      reportError(e);
	      logger.error('Error: $$$', e.toString());
	    }
	    else {
	      logger.error(e.toString());
	      logger.error(e.stack);
	      reportError('An error occurred. Please see the log for more details.');
	    }
	  };
	  const commandProc = makeCommandProc('shaped', roll20, errorHandler);
	  const chatWatchers = [];
	  const advantageTracker = new AdvantageTracker();
	  const usesManager = new UsesManager();
	  const ammoManager = new AmmoManager();
	  const abilityMaker = new AbilityMaker();
	  const importer = new Importer(entityLookup, parser, abilityMaker, srdConverter);
	  const modules = [
	    abilityMaker,
	    new ConfigUI(),
	    advantageTracker,
	    usesManager,
	    new RestManager(),
	    ammoManager,
	    importer,
	  ];

	  modules.forEach(module => module.configure(roll20, reporter, logger, myState, commandProc));

	  /**
	   *
	   * @param {ChatMessage} msg
	   */
	  this.handleInput = function handleInput(msg) {
	    logger.debug(msg);
	    if (msg.playerid === 'API') {
	      return;
	    }

	    reporter.setPlayer(msg.playerid);
	    if (msg.type !== 'api') {
	      this.triggerChatWatchers(msg);
	      return;
	    }

	    commandProc.processCommand(msg);
	  };

	  /////////////////////////////////////////////////
	  // Event Handlers
	  /////////////////////////////////////////////////
	  this.handleAddToken = function handleAddToken(token) {
	    const represents = token.get('represents');
	    if (_.isEmpty(represents)) {
	      return;
	    }
	    const character = roll20.getObj('character', represents);
	    if (!character) {
	      return;
	    }
	    addedTokenIds.push(token.id);

	    const wrappedChangeToken = this.wrapHandler(this.handleChangeToken);

	    // URGH. Thanks Roll20.
	    setTimeout((function wrapper(id) {
	      return function innerWrapper() {
	        const addedToken = roll20.getObj('graphic', id);
	        if (addedToken) {
	          wrappedChangeToken(addedToken);
	        }
	      };
	      /* eslint-disable no-spaced-func */
	    }(token.id)), 100);
	    /* eslint-enable no-spaced-func */
	  };

	  this.handleChangeToken = function handleChangeToken(token) {
	    if (_.contains(addedTokenIds, token.id)) {
	      addedTokenIds = _.without(addedTokenIds, token.id);
	      this.setTokenBarsOnDrop(token, true);
	      advantageTracker.handleTokenChange(token);
	    }
	  };

	  this.handleAddCharacter = function handleAddCharacter(character) {
	    if (myState.config.newCharSettings.applyToAll) {
	      importer.applyCharacterDefaults(character);
	    }
	  };

	  this.setTokenBarsOnDrop = function setTokenBarsOnDrop(token, overwrite) {
	    const character = roll20.getObj('character', token.get('represents'));
	    if (!character) {
	      return;
	    }

	    function setBar(barName, bar, value) {
	      if (value) {
	        token.set(`${barName}_value`, value);
	        if (bar.max) {
	          token.set(`${barName}_max`, value);
	        }
	      }
	    }

	    _.chain(myState.config.tokenSettings)
	      .pick('bar1', 'bar2', 'bar3')
	      .each((bar, barName) => {
	        if (bar.attribute && !token.get(`${barName}_link`) && (!token.get(`${barName}_value`) || overwrite)) {
	          if (bar.attribute === 'HP' && myState.config.sheetEnhancements.rollHPOnDrop) {
	            // Guard against characters that aren't properly configured - i.e. ones used for templates and system
	            // things rather than actual characters
	            if (_.isEmpty(roll20.getAttrByName(character.id, 'hp_formula'))) {
	              logger.debug('Ignoring character $$$ for rolling HP - has no hp_formula attribute',
	                character.get('name'));
	              return;
	            }
	            roll20.sendChat('', `%{${character.get('name')}|shaped_npc_hp}`, (results) => {
	              if (results && results.length === 1) {
	                const message = this.processInlinerolls(results[0]);
	                if (!results[0].inlinerolls || !results[0].inlinerolls[0]) {
	                  logger.warn('HP roll didn\'t have the expected structure. This is what we got back: $$$',
	                    results[0]);
	                }
	                else {
	                  roll20.sendChat('HP Roller', `/w GM &{template:5e-shaped} ${message}`, null, { noarchive: true });
	                  setBar(barName, bar, results[0].inlinerolls[0].results.total);
	                }
	              }
	            });
	          }
	          else {
	            setBar(barName, bar, roll20.getAttrByName(character.id, bar.attribute));
	          }
	        }
	      });
	  };

	  this.registerChatWatcher = function registerChatWatcher(handler, triggerFields) {
	    const matchers = [];
	    if (triggerFields && !_.isEmpty(triggerFields)) {
	      matchers.push((msg, options) => {
	        logger.debug('Matching options: $$$ against triggerFields $$$', options, triggerFields);
	        return _.intersection(triggerFields, _.keys(options)).length === triggerFields.length;
	      });
	    }
	    chatWatchers.push({ matchers, handler: handler.bind(this) });
	  };

	  this.triggerChatWatchers = function triggerChatWatchers(msg) {
	    const options = this.getRollTemplateOptions(msg);
	    logger.debug('Roll template options: $$$', options);
	    _.each(chatWatchers, (watcher) => {
	      if (_.every(watcher.matchers, matcher => matcher(msg, options))) {
	        watcher.handler(options, msg);
	      }
	    });
	  };

	  this.handleHD = function handleHD(options, msg) {
	    const match = options.title.match(/(\d+)d(\d+) HIT_DICE/);
	    if (match && myState.config.sheetEnhancements.autoHD) {
	      const hdCount = parseInt(match[1], 10);
	      const hdSize = match[2];
	      const hdAttr = roll20.getAttrObjectByName(options.character.id, `hd_d${hdSize}`);
	      const hpAttr = roll20.getOrCreateAttr(options.character.id, 'HP');
	      const newHp = Math.min(parseInt(hpAttr.get('current') || 0, 10) +
	        this.getRollValue(msg, options.roll1), hpAttr.get('max') || Infinity);

	      if (hdAttr) {
	        if (hdCount <= hdAttr.get('current')) {
	          hdAttr.setWithWorker('current', hdAttr.get('current') - hdCount);
	          hpAttr.setWithWorker('current', newHp);
	          if (!hpAttr.get('max')) {
	            hpAttr.setWithWorker('max', newHp);
	          }
	        }
	        else {
	          reportPublic('HD Police', `${options.characterName} can't use ${hdCount}d${hdSize} hit dice because they ` +
	            `only have ${hdAttr.get('current')} left`);
	        }
	      }
	    }
	  };

	  this.handleD20Roll = function handleD20Roll(options) {
	    const autoRevertOptions = roll20.getAttrByName(options.character.id, 'auto_revert_advantage');
	    if (autoRevertOptions === 1) {
	      advantageTracker.setRollOption('normal', [options.character]);
	    }
	  };

	  this.handleDeathSave = function handleDeathSave(options, msg) {
	    if (roll20.getAttrByName(options.character.id, 'shaped_d20') === '1d20') {
	      return;
	    }
	    const currentHP = roll20.getAttrByName(options.character.id, 'HP');
	    if (currentHP !== 0 && currentHP !== '0') {
	      reportPublic('Death Saves', `${options.character.get('name')} has more than 0 HP and shouldn't be rolling death` +
	        ' saves');
	      return;
	    }

	    const successes = roll20.getAttrObjectByName(options.character.id, 'death_saving_throw_successes');
	    let successCount = successes.get('current');
	    const failures = roll20.getAttrObjectByName(options.character.id, 'death_saving_throw_failures');
	    let failureCount = failures.get('current');
	    const result = this.getRollValue(msg, options.roll1);

	    switch (result) {
	      case 1:
	        failureCount += 2;
	        break;
	      case 20:
	        failureCount = 0;
	        successCount = 0;

	        roll20.setAttrWithWorker(options.character.id, 'HP', 1);
	        reportPublic('Death Saves', `${options.character.get('name')} has recovered to 1 HP`);
	        break;
	      default:
	        if (result >= 10) {
	          successCount++;
	        }
	        else {
	          failureCount++;
	        }
	    }

	    if (failureCount >= 3) {
	      failureCount = 3;
	      reportPublic('Death Saves', `${options.character.get('name')} has failed 3` +
	        ' death saves and is now dead');
	    }
	    else if (successCount >= 3) {
	      reportPublic('Death Saves', `${options.character.get('name')} has succeeded 3` +
	        ' death saves and is now stable');
	      failureCount = 0;
	      successCount = 0;
	    }
	    successes.setWithWorker({ current: successCount });
	    failures.setWithWorker({ current: failureCount });
	  };

	  this.handleFX = function handleFX(options, msg) {
	    const parts = options.fx.split(' ');
	    if (parts.length < 2 || _.some(parts.slice(0, 2), _.isEmpty)) {
	      logger.warn('FX roll template variable is not formated correctly: [$$$]', options.fx);
	      return;
	    }


	    const fxType = parts[0];
	    const pointsOfOrigin = parts[1];
	    let targetTokenId;
	    const sourceCoords = {};
	    const targetCoords = {};
	    let fxCoords = [];
	    let pageId;

	    // noinspection FallThroughInSwitchStatementJS
	    switch (pointsOfOrigin) {
	      case 'sourceToTarget':
	      case 'source':
	        targetTokenId = parts[2];
	        fxCoords.push(sourceCoords, targetCoords);
	        break;
	      case 'targetToSource':
	      case 'target':
	        targetTokenId = parts[2];
	        fxCoords.push(targetCoords, sourceCoords);
	        break;
	      default:
	        throw new Error(`Unrecognised pointsOfOrigin type in fx spec: ${pointsOfOrigin}`);
	    }

	    if (targetTokenId) {
	      const targetToken = roll20.getObj('graphic', targetTokenId);
	      pageId = targetToken.get('_pageid');
	      targetCoords.x = targetToken.get('left');
	      targetCoords.y = targetToken.get('top');
	    }
	    else {
	      pageId = roll20.getCurrentPage(msg.playerid).id;
	    }


	    const casterTokens = roll20.findObjs({ type: 'graphic', pageid: pageId, represents: options.character.id });

	    if (casterTokens.length) {
	      // If there are multiple tokens for the character on this page, then try and find one of them that is selected
	      // This doesn't work without a selected token, and the only way we can get this is to use @{selected} which is a
	      // pain for people who want to launch without a token selected if(casterTokens.length > 1) { const selected =
	      // _.findWhere(casterTokens, {id: sourceTokenId}); if (selected) { casterTokens = [selected]; } }
	      sourceCoords.x = casterTokens[0].get('left');
	      sourceCoords.y = casterTokens[0].get('top');
	    }


	    if (!fxCoords[0]) {
	      logger.warn('Couldn\'t find required point for fx for character $$$, casterTokens: $$$, fxSpec: $$$ ',
	        options.character.id, casterTokens, options.fx);
	      return;
	    }
	    else if (!fxCoords[1]) {
	      fxCoords = fxCoords.slice(0, 1);
	    }

	    roll20.spawnFx(fxCoords, fxType, pageId);
	  };

	  this.getRollValue = function getRollValue(msg, rollOutputExpr) {
	    const rollIndex = rollOutputExpr.match(/\$\[\[(\d+)]]/)[1];
	    return msg.inlinerolls[rollIndex].results.total;
	  };

	  this.handleSpellCast = function handleSpellCast(options) {
	    if (options.ritual || !myState.config.sheetEnhancements.autoSpellSlots ||
	      options.spellLevel === 'CANTRIP' || options.spellRepeat) {
	      return;
	    }

	    const castingLevel = parseInt(options.castAsLevel, 10);
	    if (_.isNaN(castingLevel)) {
	      logger.error('Bad casting level [$$$]', options.castAsLevel);
	      reportError('An error occured with spell slots, see the log for more details');
	      return;
	    }

	    const spellPointsAttr = roll20.getAttrObjectByName(options.character.id, 'spell_points');
	    if (spellPointsAttr && spellPointsAttr.get('current')) {
	      const spellPointsLimit = parseInt(roll20.getAttrByName(options.character.id, 'spell_points_limit'), 10);
	      const cost = castingLevel + Math.floor(castingLevel / 3) + 1;
	      if (castingLevel <= spellPointsLimit && cost <= spellPointsAttr.get('current')) {
	        spellPointsAttr.setWithWorker({ current: spellPointsAttr.get('current') - cost });
	        return;
	      }
	    }


	    const spellSlotAttr = roll20.getAttrObjectByName(options.character.id, `spell_slots_l${options.castAsLevel}`);
	    const warlockSlotsAttr = roll20.getAttrObjectByName(options.character.id, 'warlock_spell_slots');
	    if (warlockSlotsAttr && warlockSlotsAttr.get('current')) {
	      const warlockSlotsLevelString = roll20.getAttrByName(options.character.id, 'warlock_spells_max_level');
	      logger.debug('Warlock slots level: $$$', warlockSlotsLevelString);
	      const warlockSlotsLevel = warlockSlotsLevelString ? parseInt(warlockSlotsLevelString.substring(0, 1), 10) : 0;
	      logger.debug('Parsed warlock slots level: $$$', warlockSlotsLevel);
	      if (warlockSlotsLevel === castingLevel) {
	        logger.debug('Decrementing warlock spell slots attribute $$$', warlockSlotsAttr);
	        warlockSlotsAttr.setWithWorker({ current: warlockSlotsAttr.get('current') - 1 });
	        return;
	      }
	    }

	    if (spellSlotAttr && spellSlotAttr.get('current')) {
	      logger.debug('Decrementing normal spell slots attribute $$$', spellSlotAttr);
	      spellSlotAttr.setWithWorker({ current: spellSlotAttr.get('current') - 1 });
	    }
	    else {
	      reportPublic('Slots Police', `${options.characterName} cannot cast ${options.title} at level ` +
	        `${options.castAsLevel} because they don't have enough spell slots/points.`);
	    }
	  };

	  /**
	   *
	   * @returns {*}
	   */
	  this.getRollTemplateOptions = function getRollTemplateOptions(msg) {
	    if (msg.rolltemplate === '5e-shaped') {
	      const regex = /\{\{(.*?)}}/g;
	      let match;
	      const options = {};
	      while ((match = regex.exec(msg.content))) {
	        if (match[1]) {
	          const splitAttr = match[1].split('=');
	          const propertyName = splitAttr[0].replace(/_([a-z])/g, (m, letter) => letter.toUpperCase());
	          options[propertyName] = splitAttr.length === 2 ? splitAttr[1].replace(/\^\{/, '') : '';
	        }
	      }
	      if (options.characterName) {
	        options.character = roll20.findObjs({
	          _type: 'character',
	          name: options.characterName,
	        })[0];
	      }
	      return options;
	    }
	    return {};
	  };

	  this.processInlinerolls = function processInlinerolls(msg) {
	    if (_.has(msg, 'inlinerolls')) {
	      return _.chain(msg.inlinerolls)
	        .reduce((previous, current, index) => {
	          previous[`$[[${index}]]`] = current.results.total || 0;
	          return previous;
	        }, {})
	        .reduce((previous, current, index) => previous.replace(index.toString(), current), msg.content)
	        .value();
	    }

	    return msg.content;
	  };

	  this.checkInstall = function checkInstall() {
	    logger.info('-=> ShapedScripts v6.2.0 <=-');
	    Migrator.migrateShapedConfig(myState, logger);
	    const character = roll20.createObj('character', { name: 'SHAPED_VERSION_TESTER' });
	    setTimeout(() => {
	      roll20.createAttrWithWorker(character.id, 'sheet_opened', 1, () => {
	        const version = roll20.getAttrByName(character.id, 'version');
	        character.remove();
	        commandProc.setRequiredCharacterVersion(version);
	        logger.info('Detected sheet version as : $$$', version);
	      });
	    }, 400);
	  };

	  this.wrapHandler = function wrapHandler(handler) {
	    const self = this;
	    return function handlerWrapper() {
	      try {
	        handler.apply(self, arguments);
	      }
	      catch (e) {
	        errorHandler(e);
	      }
	      finally {
	        logger.prefixString = '';
	      }
	    };
	  };

	  this.updateBarsForCharacterTokens = function updateBarsForCharacterTokens(curr) {
	    roll20.findObjs({ type: 'graphic', represents: curr.get('characterid') })
	      .forEach(token => this.setTokenBarsOnDrop(token, false));
	  };

	  this.getAttributeChangeHandler = function getAttributeChangeHandler(attributeName) {
	    const handlers = {
	      shaped_d20: advantageTracker.handleRollOptionChange.bind(advantageTracker),
	    };

	    _.chain(myState.config.tokenSettings)
	      .pick('bar1', 'bar2', 'bar3')
	      .pluck('attribute')
	      .each((attrName) => {
	        if (attrName === 'HP') {
	          attrName = 'hp_formula';
	        }
	        handlers[attrName] = this.updateBarsForCharacterTokens.bind(this);
	      });

	    return handlers[attributeName];
	  };

	  this.registerEventHandlers = function registerEventHandlers() {
	    roll20.on('chat:message', this.wrapHandler(this.handleInput));
	    roll20.on('add:token', this.wrapHandler(this.handleAddToken));
	    roll20.on('change:token', this.wrapHandler(this.handleChangeToken));
	    roll20.on('change:attribute', this.wrapHandler((curr, prev) => {
	      const handler = this.getAttributeChangeHandler(curr.get('name'));
	      if (handler) {
	        handler(curr, prev);
	      }
	    }));
	    roll20.on('add:character', this.wrapHandler(this.handleAddCharacter));
	    this.registerChatWatcher(this.handleDeathSave, ['deathSavingThrow', 'character', 'roll1']);
	    this.registerChatWatcher(ammoManager.consumeAmmo.bind(ammoManager), ['ammoName', 'character']);
	    this.registerChatWatcher(this.handleFX, ['fx', 'character']);
	    this.registerChatWatcher(this.handleHD, ['character', 'title']);
	    this.registerChatWatcher(this.handleD20Roll, ['character', '2d20kh1']);
	    this.registerChatWatcher(this.handleD20Roll, ['character', '2d20kl1']);
	    this.registerChatWatcher(usesManager.handleUses.bind(usesManager), ['character', 'uses', 'repeatingItem']);
	    this.registerChatWatcher(usesManager.handleLegendary.bind(usesManager), ['character', 'legendary']);
	    this.registerChatWatcher(this.handleSpellCast, ['character', 'spell', 'castAsLevel']);
	  };

	  logger.wrapModule(this);
	}

	ShapedScripts.prototype.logWrap = 'ShapedScripts';


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);
	const utils = __webpack_require__(7);
	const UserError = __webpack_require__(13);
	const ShapedModule = __webpack_require__(14);


	function getParser(optionString, validator) {
	  return function parseOptions(arg, errors, options) {
	    const argParts = arg.split(/\s+/);
	    if (argParts[0].toLowerCase() === optionString.toLowerCase()) {
	      const value = argParts.length === 1 ? true : argParts.slice(1).join(' ');
	      const result = validator(value);
	      if (result.valid) {
	        options[argParts[0]] = result.converted;
	      }
	      else {
	        errors.push(`Invalid value [${value}] for option [${argParts[0]}]`);
	      }
	      return true;
	    }
	    return false;
	  };
	}

	function getObjectParser(specObject) {
	  return function parseOptions(arg, errors, options) {
	    const argParts = arg.split(/\s+/);
	    const newObject = utils.createObjectFromPath(argParts[0], argParts.slice(1).join(' '));

	    const comparison = { spec: specObject, actual: newObject };
	    while (comparison.spec) {
	      const key = _.keys(comparison.actual)[0];
	      const spec = comparison.spec[key];
	      if (!spec) {
	        return false;
	      }
	      if (_.isFunction(comparison.spec[key])) {
	        const result = comparison.spec[key](comparison.actual[key]);
	        if (result.valid) {
	          comparison.actual[key] = result.converted;
	          utils.deepExtend(options, newObject);
	        }
	        else {
	          errors.push(`Invalid value [${comparison.actual[key]}] for option [${argParts[0]}]`);
	        }
	        return true;
	      }
	      else if (_.isArray(comparison.actual[key])) {
	        const newVal = [];
	        newVal[comparison.actual[key].length - 1] = comparison.spec[key][0];
	        comparison.spec = newVal;
	        comparison.actual = comparison.actual[key];
	      }
	      else {
	        comparison.spec = comparison.spec[key];
	        comparison.actual = comparison.actual[key];
	      }
	    }
	    return false;
	  };
	}

	/**
	 * @constructor
	 */

	class Command {
	  constructor(root, handler, roll20, name, gmOnly) {
	    this.root = root;
	    this.handler = handler;
	    this.parsers = [];
	    this.roll20 = roll20;
	    this.name = name;
	    this.gmOnly = gmOnly;
	  }


	  option(optionString, validator, required) {
	    let parser;
	    if (_.isFunction(validator)) {
	      parser = getParser(optionString, validator);
	    }
	    else if (_.isObject(validator)) {
	      const dummy = {};
	      dummy[optionString] = validator;
	      parser = getObjectParser(dummy);
	    }
	    else {
	      throw new Error(`Bad validator [${validator}] specified for option ${optionString}`);
	    }
	    parser.required = required;
	    parser.optName = optionString;
	    this.parsers.push(parser);
	    return this;
	  }

	  options(optsSpec) {
	    _.each(optsSpec, (validator, key) => this.option(key, validator));
	    return this;
	  }

	  optionLookup(groupName, lookup, required) {
	    if (typeof lookup !== 'function') {
	      lookup = _.propertyOf(lookup);
	    }
	    const parser = (arg, errors, options) => {
	      const singleResolved = lookup(arg, options);
	      if (singleResolved) {
	        options[groupName] = options[groupName] || [];
	        options[groupName].push.apply(options[groupName],
	          _.isArray(singleResolved) ? singleResolved : [singleResolved]);
	        return true;
	      }


	      const results = _.chain(arg.split(','))
	        .map(_.partial(_.result, _, 'trim'))
	        .uniq()
	        .reduce((memo, name) => {
	          const resolvedPart = lookup(name, options);
	          if (resolvedPart) {
	            memo.resolved.push(resolvedPart);
	          }
	          else {
	            memo.errors.push(`Unrecognised item ${name} for option group ${groupName}`);
	          }
	          return memo;
	        }, { errors: [], resolved: [] })
	        .value();

	      if (!_.isEmpty(results.resolved)) {
	        options[groupName] = results.resolved;
	        errors.push.apply(errors, results.errors);
	        return true;
	      }
	      return false;
	    };
	    parser.optName = groupName;
	    parser.required = required;
	    this.parsers.push(parser);
	    return this;
	  }

	  handle(args, selection, cmdString, playerIsGM, playerId, requiredCharVersion) {
	    if (!playerIsGM && this.gmOnly) {
	      throw new UserError('You must be a GM to run this command');
	    }
	    const caches = {};
	    const startOptions = {
	      errors: [],
	    };
	    Object.defineProperty(startOptions, 'getCache', {
	      enumerable: false,
	      value: function getCache(key) {
	        return (caches[key] = caches[key] || {});
	      },
	    });

	    startOptions.selected =
	      this.selectionSpec && processSelection(selection || [], this.selectionSpec, this.roll20, requiredCharVersion);
	    const finalOptions = _.chain(args)
	      .reduce((options, arg) => {
	        if (!_.some(this.parsers, parser => parser(arg, options.errors, options))) {
	          options.errors.push(`Unrecognised or poorly formed option ${arg}`);
	        }

	        return options;
	      }, startOptions)
	      .each((propVal, propName, obj) => {
	        // NB Cannot use omit or it will remove the getCache property
	        if (_.isUndefined(propVal)) {
	          delete obj[propName];
	        }
	      })
	      .value();

	    if (finalOptions.errors.length > 0) {
	      throw finalOptions.errors.join('\n');
	    }
	    delete finalOptions.errors;


	    const missingOpts = _.chain(this.parsers)
	      .where({ required: true })
	      .pluck('optName')
	      .difference(_.keys(finalOptions))
	      .value();

	    if (!_.isEmpty(missingOpts)) {
	      throw new UserError(`Command ${cmdString} was missing options: [${missingOpts.join(',')}]`);
	    }

	    if (finalOptions.character && !playerIsGM) {
	      finalOptions.character.forEach((character) => {
	        if (!character.controlledby.contains(playerId) && !character.controlledby.contains('all')) {
	          throw new UserError(`You do not have permission to make changes to character ${character.get('name')}`);
	        }
	      });
	    }

	    return this.handler(finalOptions);
	  }

	  withSelection(selectionSpec) {
	    this.selectionSpec = selectionSpec;
	    return this;
	  }


	  addCommand() {
	    return this.root.addCommand.apply(this.root, arguments);
	  }

	  addModule() {
	    return this.root.addModule.apply(this.root, arguments);
	  }

	  processCommand() {
	    return this.root.processCommand.apply(this.root, arguments);
	  }

	  get logWrap() {
	    return `command [${this.name}]`;
	  }
	}

	function processSelection(selection, constraints, roll20, requiredCharVersion) {
	  return _.reduce(constraints, (result, constraintDetails, type) => {
	    const objects = _.chain(selection)
	      .where({ _type: type === 'character' ? 'graphic' : type })
	      .map(selected => roll20.getObj(selected._type, selected._id))
	      .map((object) => {
	        if (type === 'character' && object) {
	          const char = roll20.getObj('character', object.get('represents'));
	          if (!constraintDetails.anyVersion) {
	            const version = roll20.getAttrByName(char.id, 'version');
	            if (version !== requiredCharVersion) {
	              throw new UserError(`Character ${char.get('name')} is not at the required sheet version ` +
	                `[${requiredCharVersion}], but instead [${version}]. Try opening the character sheet or running ` +
	                '!shaped-update-character to update it.');
	            }
	          }
	          return char;
	        }
	        return object;
	      })
	      .compact()
	      .uniq()
	      .value();
	    if (_.size(objects) < constraintDetails.min || _.size(objects) > constraintDetails.max) {
	      throw new UserError(`Wrong number of objects of type [${type}] selected, should be between ` +
	        `${constraintDetails.min} and ${constraintDetails.max}`);
	    }
	    switch (_.size(objects)) {
	      case 0:
	        break;
	      case 1:
	        if (constraintDetails.max === 1) {
	          result[type] = objects[0];
	        }
	        else {
	          result[type] = objects;
	        }
	        break;
	      default:
	        result[type] = objects;
	    }
	    return result;
	  }, {});
	}

	module.exports = function commandParser(rootCommand, roll20, errorHandler) {
	  const commands = {};
	  let requiredCharVersion = null;
	  return {
	    setRequiredCharacterVersion(version) {
	      requiredCharVersion = version;
	    },

	    addCommand(cmds, handler, gmOnly) {
	      const command = new Command(this, handler, roll20, _.isArray(cmds) ? cmds.join(',') : cmds, gmOnly);
	      (_.isArray(cmds) ? cmds : [cmds]).forEach(cmdString => (commands[cmdString] = command));
	      return command;
	    },

	    addModule(module) {
	      if (!(module instanceof ShapedModule)) {
	        throw new Error('Can only pass ShapedModules to addModule');
	      }
	      return module.configure(this);
	    },

	    processCommand(msg) {
	      const prefix = `!${rootCommand}-`;
	      if (msg.type === 'api' && msg.content.indexOf(prefix) === 0) {
	        const cmdString = msg.content.slice(prefix.length);
	        const parts = cmdString.split(/\s+--/);
	        const cmdName = parts.shift();
	        const cmd = commands[cmdName];
	        if (!cmd) {
	          throw new UserError(`Unrecognised command ${prefix}${cmdName}`);
	        }
	        const returnVal = cmd.handle(parts, msg.selected, `${prefix}${cmdName}`,
	          roll20.playerIsGM(msg.playerid), msg.playerid, requiredCharVersion);
	        if (returnVal instanceof Promise) {
	          returnVal.catch(errorHandler);
	        }
	      }
	    },

	    logWrap: 'commandParser',
	  };
	};


/***/ },
/* 13 */
/***/ function(module, exports) {

	'use strict';


	class UserError extends Error {
	  constructor(message) {
	    super();
	    this.message = message;
	  }
	}

	module.exports = UserError;


/***/ },
/* 14 */
/***/ function(module, exports) {

	'use strict';

	module.exports = class ShapedModule {
	  configure(roll20, reporter, logger, myState, commandProcessor) {
	    this.roll20 = roll20;
	    this.reporter = reporter;
	    this.logger = logger;
	    this.myState = myState;
	    logger.wrapModule(this);
	    this.addCommands(commandProcessor);
	  }

	  addCommands(/* commandProcessor */) {
	    throw new Error('Subclasses must implement addCommands');
	  }

	  reportPublic(heading, text) {
	    this.reporter.reportPublic(heading, text);
	  }

	  reportPlayer(heading, text) {
	    this.reporter.reportPlayer(heading, text);
	  }

	  reportError(text) {
	    this.reporter.reportError(text);
	  }

	  get logWrap() {
	    return this.constructor.name;
	  }
	};


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);
	const utils = __webpack_require__(7);

	const oneSixConfig = {
	  logLevel: 'INFO',
	  tokenSettings: {
	    number: false,
	    bar1: {
	      attribute: 'HP',
	      max: true,
	      link: false,
	      showPlayers: false,
	    },
	    bar2: {
	      attribute: 'speed',
	      max: false,
	      link: true,
	      showPlayers: false,
	    },
	    bar3: {
	      attribute: '',
	      max: false,
	      link: false,
	      showPlayers: false,
	    },
	    aura1: {
	      radius: '',
	      color: '#FFFF99',
	      square: false,
	    },
	    aura2: {
	      radius: '',
	      color: '#59e594',
	      square: false,
	    },
	    light: {
	      radius: '',
	      dimRadius: '',
	      otherPlayers: false,
	      hasSight: false,
	      angle: 360,
	      losAngle: 360,
	      multiplier: 1,
	    },
	    showName: true,
	    showNameToPlayers: false,
	    showAura1ToPlayers: true,
	    showAura2ToPlayers: true,
	  },
	  newCharSettings: {
	    sheetOutput: '@{output_to_all}',
	    deathSaveOutput: '@{output_to_all}',
	    initiativeOutput: '@{output_to_all}',
	    showNameOnRollTemplate: '@{show_character_name_yes}',
	    rollOptions: '@{normal}',
	    initiativeRoll: '@{normal_initiative}',
	    initiativeToTracker: '@{initiative_to_tracker_yes}',
	    breakInitiativeTies: '@{initiative_tie_breaker_var}',
	    showTargetAC: '@{attacks_vs_target_ac_no}',
	    showTargetName: '@{attacks_vs_target_name_no}',
	    autoAmmo: '@{ammo_auto_use_var}',
	    autoRevertAdvantage: false,
	    houserules: {
	      savingThrowsHalfProf: false,
	      mediumArmorMaxDex: 2,
	    },
	  },
	  advTrackerSettings: {
	    showMarkers: false,
	    ignoreNpcs: false,
	    advantageMarker: 'green',
	    disadvantageMarker: 'red',
	    output: 'silent',
	  },
	  sheetEnhancements: {
	    rollHPOnDrop: true,
	    autoHD: true,
	    autoSpellSlots: true,
	  },
	  genderPronouns: [
	    {
	      matchPattern: '^f$|female|girl|woman|feminine',
	      nominative: 'she',
	      accusative: 'her',
	      possessive: 'her',
	      reflexive: 'herself',
	    },
	    {
	      matchPattern: '^m$|male|boy|man|masculine',
	      nominative: 'he',
	      accusative: 'him',
	      possessive: 'his',
	      reflexive: 'himself',
	    },
	    {
	      matchPattern: '^n$|neuter|none|construct|thing|object',
	      nominative: 'it',
	      accusative: 'it',
	      possessive: 'its',
	      reflexive: 'itself',
	    },
	  ],
	  defaultGenderIndex: 2,

	};


	class Migrator {

	  constructor(startVersion) {
	    this._versions = [{ version: startVersion || 0.1, migrations: [] }];
	  }

	  skipToVersion(version) {
	    this._versions.push({ version, migrations: [] });
	    return this;
	  }

	  nextVersion() {
	    const currentVersion = this._versions.slice(-1)[0].version;
	    const nextVersion = (currentVersion * 10 + 1) / 10; // Avoid FP errors
	    this._versions.push({ version: nextVersion, migrations: [] });
	    return this;
	  }

	  addProperty(path, value) {
	    const expandedProperty = utils.createObjectFromPath(path, value);
	    return this.transformConfig(config => utils.deepExtend(config, expandedProperty),
	      `Adding property ${path} with value ${value}`);
	  }

	  overwriteProperty(path, value) {
	    return this.transformConfig((config) => {
	      const parts = path.split('.');
	      const obj = parts.length > 1 ? utils.getObjectFromPath(config, parts.slice(0, -1).join('.')) : config;
	      obj[parts.slice(-1)[0]] = value;
	      return config;
	    }, `Overwriting property ${path} with value ${JSON.stringify(value)}`);
	  }

	  copyProperty(oldPath, newPath) {
	    return this.transformConfig(Migrator.propertyCopy.bind(null, oldPath, newPath),
	      `Copying property from ${oldPath} to ${newPath}`);
	  }


	  static propertyCopy(oldPath, newPath, config) {
	    const oldVal = utils.getObjectFromPath(config, oldPath);
	    if (!_.isUndefined(oldVal)) {
	      const expandedProperty = utils.createObjectFromPath(newPath, oldVal);
	      utils.deepExtend(config, expandedProperty);
	    }
	    return config;
	  }

	  static propertyDelete(path, config) {
	    const parts = path.split('.');
	    const obj = parts.length > 1 ? utils.getObjectFromPath(config, parts.slice(0, -1).join('.')) : config;
	    if (obj && !_.isUndefined(obj[parts.slice(-1)[0]])) {
	      delete obj[parts.slice(-1)[0]];
	    }
	    return config;
	  }

	  deleteProperty(propertyPath) {
	    return this.transformConfig(Migrator.propertyDelete.bind(null, propertyPath),
	      `Deleting property ${propertyPath} from config`);
	  }

	  moveProperty(oldPath, newPath) {
	    return this.transformConfig((config) => {
	      config = Migrator.propertyCopy(oldPath, newPath, config);
	      return Migrator.propertyDelete(oldPath, config);
	    }, `Moving property from ${oldPath} to ${newPath}`);
	  }

	  transformConfig(transformer, message) {
	    const lastVersion = this._versions.slice(-1)[0];
	    lastVersion.migrations.push({ transformer, message });
	    return this;
	  }

	  migrateConfig(state, logger) {
	    logger.info('Checking config for upgrade, starting state: $$$', state);
	    if (_.isEmpty(state)) {
	      // working with a fresh install here
	      state.version = 0;
	    }
	    if (!this._versions.find(version => version.version >= state.version)) {
	      throw new Error(`Unrecognised schema state ${state.version} - cannot upgrade.`);
	    }

	    return this._versions
	      .filter(version => version.version > state.version)
	      .reduce((versionResult, version) => {
	        logger.info('Upgrading schema to version $$$', version.version);

	        versionResult = version.migrations.reduce((result, migration) => {
	          logger.info(migration.message);
	          return migration.transformer(result);
	        }, versionResult);
	        versionResult.version = version.version;
	        logger.info('Post-upgrade state: $$$', versionResult);
	        return versionResult;
	      }, state);
	  }
	}


	const migrator = new Migrator()
	  .addProperty('config', {})
	  .skipToVersion(0.4)
	  .overwriteProperty('config.genderPronouns', utils.deepClone(oneSixConfig).genderPronouns)
	  .skipToVersion(1.2)
	  .moveProperty('config.autoHD', 'config.sheetEnhancements.autoHD')
	  .moveProperty('config.rollHPOnDrop', 'config.sheetEnhancements.rollHPOnDrop')
	  .skipToVersion(1.4)
	  .moveProperty('config.newCharSettings.savingThrowsHalfProf',
	    'config.newCharSettings.houserules.savingThrowsHalfProf')
	  .moveProperty('config.newCharSettings.mediumArmorMaxDex', 'config.newCharSettings.houserules.mediumArmorMaxDex')
	  .skipToVersion(1.6)
	  .transformConfig((state) => {
	    _.defaults(state.config, oneSixConfig);
	    _.defaults(state.config.tokenSettings, oneSixConfig.tokenSettings);
	    _.defaults(state.config.newCharSettings, oneSixConfig.newCharSettings);
	    _.defaults(state.config.advTrackerSettings, oneSixConfig.advTrackerSettings);
	    _.defaults(state.config.sheetEnhancements, oneSixConfig.sheetEnhancements);
	    return state;
	  }, 'Applying defaults as at schema version 1.6')
	  // 1.7
	  // add base houserules and variants section
	  // add sheetEnhancements.autoTraits
	  .nextVersion()
	  .addProperty('config.variants', {
	    rests: {
	      longNoHpFullHd: false,
	    },
	  })
	  .addProperty('config.sheetEnhancements.autoTraits', true)
	  // 1.8
	  // Set tokens to have vision by default so that people see the auto-generated stuff based on senses
	  .nextVersion()
	  .overwriteProperty('config.tokenSettings.light.hasSight', true)
	  // 1.9 Add default tab setting
	  .nextVersion()
	  .addProperty('config.newCharSettings.tab', 'core')
	  // 2.0 Add default token actions
	  .nextVersion()
	  .addProperty('config.newCharSettings.tokenActions', {
	    initiative: false,
	    abilityChecks: null,
	    advantageTracker: null,
	    savingThrows: null,
	    attacks: null,
	    statblock: false,
	    traits: null,
	    actions: null,
	    reactions: null,
	    legendaryActions: null,
	    lairActions: null,
	    regionalEffects: null,
	    rests: false,
	  })
	  // 2.1 Add spells token action
	  .nextVersion()
	  .addProperty('config.newCharSettings.tokenActions.spells', false)
	  // 2.2 Changes to support new roll behaviour in sheet 4.2.1
	  .nextVersion()
	  .overwriteProperty('config.newCharSettings.sheetOutput', '')
	  .overwriteProperty('config.newCharSettings.deathSaveOutput', '')
	  .overwriteProperty('config.newCharSettings.initiativeOutput', '')
	  .overwriteProperty('config.newCharSettings.showNameOnRollTemplate', '')
	  .overwriteProperty('config.newCharSettings.rollOptions', '')
	  .overwriteProperty('config.newCharSettings.initiativeRoll', '')
	  .overwriteProperty('config.newCharSettings.initiativeToTracker', '')
	  .overwriteProperty('config.newCharSettings.breakInitiativeTies', '')
	  .overwriteProperty('config.newCharSettings.showTargetAC', '')
	  .overwriteProperty('config.newCharSettings.showTargetName', '')
	  .overwriteProperty('config.newCharSettings.autoAmmo', '1')
	  // 2.3 Remove "small" macros
	  .nextVersion()
	  .transformConfig((config) => {
	    _.each(config.config.newCharSettings.tokenActions, (value, key) => {
	      if (typeof value === 'string' && value.match('.*Small$')) {
	        config.config.newCharSettings.tokenActions[key] = value.replace(/Small$/, '');
	      }
	    });
	    return config;
	  }, 'Removing "small" macros')
	  .addProperty('config.newCharSettings.textSizes', {
	    spellsTextSize: 'text',
	    abilityChecksTextSize: 'text',
	    savingThrowsTextSize: 'text',
	  })
	  // 2.4 Don't set default values for sheet options to save on attribute bloat
	  .nextVersion()
	  .transformConfig((config) => {
	    const ncs = config.config.newCharSettings;
	    const defaults = {
	      sheetOutput: '',
	      deathSaveOutput: '',
	      initiativeOutput: '',
	      showNameOnRollTemplate: '',
	      rollOptions: '{{ignore=[[0',
	      initiativeRoll: '@{shaped_d20}',
	      initiativeToTracker: '@{selected|initiative_formula} &{tracker}',
	      breakInitiativeTies: '',
	      showTargetAC: '',
	      showTargetName: '',
	      autoAmmo: '',
	      tab: 'core',
	    };
	    _.each(defaults, (defaultVal, key) => {
	      if (ncs[key] === defaultVal) {
	        ncs[key] = '***default***';
	      }
	    });

	    if (ncs.houserules.mediumArmorMaxDex === '2') {
	      ncs.houserules.mediumArmorMaxDex = '***default***';
	    }

	    ['spellsTextSize', 'abilityChecksTextSize', 'savingThrowsTextSize'].forEach((prop) => {
	      if (ncs.textSizes[prop] === 'text_big') {
	        ncs.textSizes[prop] = '***default***';
	      }
	    });

	    return config;
	  }, 'Removing default values')
	  // 2.5 Custom saving throws
	  .nextVersion()
	  .addProperty('config.newCharSettings.houserules.saves', {
	    useCustomSaves: '***default***',
	    useAverageOfAbilities: '***default***',
	    fortitude: {
	      fortitudeStrength: '***default***',
	      fortitudeDexterity: '***default***',
	      fortitudeConstitution: '***default***',
	      fortitudeIntelligence: '***default***',
	      fortitudeWisdom: '***default***',
	      fortitudeCharisma: '***default***',
	    },
	    reflex: {
	      reflexStrength: '***default***',
	      reflexDexterity: '***default***',
	      reflexConstitution: '***default***',
	      reflexIntelligence: '***default***',
	      reflexWisdom: '***default***',
	      reflexCharisma: '***default***',
	    },
	    will: {
	      willStrength: '***default***',
	      willDexterity: '***default***',
	      willConstitution: '***default***',
	      willIntelligence: '***default***',
	      willWisdom: '***default***',
	      willCharisma: '***default***',
	    },
	  })
	  .moveProperty('config.newCharSettings.houserules.savingThrowsHalfProf',
	    'config.newCharSettings.houserules.saves.savingThrowsHalfProf')
	  .addProperty('config.newCharSettings.houserules.baseDC', '***default***')
	  // 2.6 expertise_as_advantage
	  .nextVersion()
	  .addProperty('config.newCharSettings.houserules.expertiseAsAdvantage', '***default***')
	  // 2.7 add hide options
	  .nextVersion()
	  .addProperty('config.newCharSettings.hide', {
	    hideAttack: '***default***',
	    hideDamage: '***default***',
	    hideAbilityChecks: '***default***',
	    hideSavingThrows: '***default***',
	    hideSavingThrowDC: '***default***',
	    hideSpellContent: '***default***',
	    hideActionFreetext: '***default***',
	    hideSavingThrowFailure: '***default***',
	    hideSavingThrowSuccess: '***default***',
	    hideRecharge: '***default***',
	  })
	  // 2.8 rename hideActionFreetext
	  .nextVersion()
	  .moveProperty('config.newCharSettings.hide.hideActionFreetext', 'config.newCharSettings.hide.hideFreetext')
	  // 2.9 make auto-applying new character settings optional (and switched off by default)
	  .nextVersion()
	  .addProperty('config.newCharSettings.applyToAll', false)
	  // 3.0 add hit dice output option + show rests option
	  .nextVersion()
	  .addProperty('config.newCharSettings.hitDiceOutput', '***default***')
	  .addProperty('config.newCharSettings.showRests', '***default***')
	  // 3.1 add hideCost
	  .nextVersion()
	  .addProperty('config.newCharSettings.hide.hideCost', '***default***')
	  // 3.2 update roll settings;
	  .nextVersion()
	  .transformConfig((config) => {
	    const ncs = config.config.newCharSettings;
	    const oldVals = {
	      advantage: 'adv {{ignore=[[0',
	      disadvantage: 'dis {{ignore=[[0',
	      two: '{{roll2=[[d20@{d20_mod}',
	    };
	    const newVals = {
	      advantage: '2d20kh1',
	      disadvantage: '2d20kl1',
	      two: '1d20',
	    };
	    const key = _.invert(oldVals)[ncs.rollOptions];
	    ncs.rollOptions = key ? newVals[key] : '***default***';
	    return config;
	  }, 'Upgrading Roll options settings to new format')
	  // 3.3 make boolean switches consistent for 9.x sheet
	  .nextVersion()
	  .transformConfig((config) => {
	    const ncs = config.config.newCharSettings;
	    [
	      'showTargetAC',
	      'showTargetName',
	      'autoAmmo',
	      'houserules.expertiseAsAdvantage',
	      'houserules.saves.useCustomSaves',
	      'houserules.saves.useAverageOfAbilities',
	      'houserules.saves.fortitude.fortitudeStrength',
	      'houserules.saves.fortitude.fortitudeDexterity',
	      'houserules.saves.fortitude.fortitudeConstitution',
	      'houserules.saves.fortitude.fortitudeIntelligence',
	      'houserules.saves.fortitude.fortitudeWisdom',
	      'houserules.saves.fortitude.fortitudeCharisma',
	      'houserules.saves.reflex.reflexStrength',
	      'houserules.saves.reflex.reflexDexterity',
	      'houserules.saves.reflex.reflexConstitution',
	      'houserules.saves.reflex.reflexIntelligence',
	      'houserules.saves.reflex.reflexWisdom',
	      'houserules.saves.reflex.reflexCharisma',
	      'houserules.saves.will.willStrength',
	      'houserules.saves.will.willDexterity',
	      'houserules.saves.will.willConstitution',
	      'houserules.saves.will.willIntelligence',
	      'houserules.saves.will.willWisdom',
	      'houserules.saves.will.willCharisma',
	    ].forEach((propPath) => {
	      const propVal = utils.getObjectFromPath(ncs, propPath);
	      const newVal = (propVal !== '***default***');
	      utils.deepExtend(ncs, utils.createObjectFromPath(propPath, newVal));
	    });
	    return config;
	  }, 'Upgrade config for 9.x character sheet')
	  // 3.4 Fix initiative settings for 9.1.0 sheet
	  .nextVersion()
	  .transformConfig((config) => {
	    const ncs = config.config.newCharSettings;
	    ncs.breakInitiativeTies = ncs.breakInitiativeTies !== '***default***';
	    if (ncs.initiativeToTracker !== '***default***') {
	      ncs.initiativeToTracker = 0;
	    }
	    return config;
	  }, 'Upgrade initiative settings')
	  // 3.5 Add option to put recharges on token actions
	  .nextVersion()
	  .addProperty('config.newCharSettings.tokenActions.showRecharges', false)
	  // 3.6 Add new props for latest sheet
	  .nextVersion()
	  .transformConfig((config) => {
	    const ncs = config.config.newCharSettings;
	    ncs.display = {
	      showPassiveSkills: false,
	      showWeight: '***default***',
	      showEmote: false,
	      showFreetext: false,
	      showFreeform: false,
	      showDiceModifiers: false,
	      showCritRange: false,
	      extraOnACrit: false,
	    };
	    ncs.measurementSystems = {
	      distanceSystem: '***default***',
	      weightSystem: '***default***',
	      encumbranceMultiplier: 1,
	    };
	    _.extend(ncs.houserules, {
	      inspirationMultiple: false,
	      criticalDamageHouserule: '***default***',
	      proficiencyDice: false,
	      psionics: false,
	      customClasses: false,
	      honorToggle: false,
	      sanityToggle: false,
	    });
	    ncs.tokenActions.racialFeatures = null;
	    ncs.tokenActions.classFeatures = null;
	    ncs.tokenActions.feats = null;
	    ncs.automaticHigherLevelQueries = '***default***';
	    return config;
	  }, 'Adding new properties for 9.x sheet settings')
	  .moveProperty('config.newCharSettings.showRests', 'config.newCharSettings.display.showRests')
	  // 3.7 Add monsterTokenName
	  .nextVersion()
	  .addProperty('config.tokenSettings.monsterTokenName', '');


	Migrator.migrateShapedConfig = migrator.migrateConfig.bind(migrator);

	module.exports = Migrator;


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);
	const utils = __webpack_require__(7);
	const ShapedModule = __webpack_require__(14);
	const ShapedConfig = __webpack_require__(17);

	const RECHARGE_LOOKUP = {
	  TURN: '(T)',
	  SHORT_OR_LONG_REST: '(SR)',
	  LONG_REST: '(LR)',
	  RECHARGE_2_6: '(2-6)',
	  RECHARGE_3_6: '(3-6)',
	  RECHARGE_4_6: '(4-6)',
	  RECHARGE_5_6: '(5-6)',
	  RECHARGE_6: '(6)',
	};

	class MacroMaker {
	  constructor(roll20) {
	    if (!roll20) {
	      throw new Error('Rol20 parameter is required for MacroMaker constructor');
	    }
	    this.roll20 = roll20;
	    this.sortKey = 'originalOrder';
	  }

	  getAbilityMaker(character) {
	    const self = this;
	    return function abilityMaker(abilitySpec) {
	      const ability = self.roll20.getOrCreateObj('ability', { characterid: character.id, name: abilitySpec.name });
	      ability.set({ action: abilitySpec.action, istokenaction: true });
	      return abilitySpec.name;
	    };
	  }
	}

	class AbilityDeleter extends MacroMaker {
	  constructor(roll20) {
	    super(roll20);
	    this.sortKey = '';
	  }

	  run(character) {
	    const abilities = this.roll20.findObjs({ type: 'ability', characterid: character.id });
	    const deleted = _.map(abilities, (obj) => {
	      const name = obj.get('name');
	      obj.remove();
	      return name;
	    });

	    return `Deleted: ${_.isEmpty(deleted) ? 'None' : deleted.join(', ')}`;
	  }
	}

	class RepeatingAbilityMaker extends MacroMaker {
	  constructor(repeatingSection, abilityName, label, canMark, roll20) {
	    super(roll20);
	    this.repeatingSection = repeatingSection;
	    this.abilityName = abilityName;
	    this.label = label;
	    this.canMark = canMark;
	  }

	  run(character, options) {
	    const cache = options.getCache(character.id);
	    cache[this.repeatingSection] = cache[this.repeatingSection] ||
	      this.roll20.getRepeatingSectionItemIdsByName(character.id, this.repeatingSection);

	    const configured = _.chain(cache[this.repeatingSection])
	      .map((repeatingId, repeatingName) => {
	        let repeatingAction = `%{${character.id}|repeating_${this.repeatingSection}_${repeatingId}` +
	          `_${this.abilityName}}`;
	        let name = utils.toTitleCase(repeatingName);
	        if (options.showRecharges) {
	          const recharge = this.roll20.getAttrByName(character.id,
	            `repeating_${this.repeatingSection}_${repeatingId}_recharge`);
	          if (RECHARGE_LOOKUP[recharge]) {
	            name += ` ${RECHARGE_LOOKUP[recharge]}`;
	          }
	        }
	        if (this.canMark && options.mark) {
	          repeatingAction += '\n!mark @{target|token_id}';
	        }
	        return { name, action: repeatingAction };
	      })
	      .map(this.getAbilityMaker(character))
	      .value();

	    const addedText = _.isEmpty(configured) ? 'Not present for character' : configured.join(', ');
	    return `${this.label}: ${addedText}`;
	  }
	}

	class RollAbilityMaker extends MacroMaker {
	  constructor(abilityName, newName, roll20) {
	    super(roll20);
	    this.abilityName = abilityName;
	    this.newName = newName;
	  }

	  run(character) {
	    return this.getAbilityMaker(character)({
	      name: this.newName,
	      action: `%{${character.id}|${this.abilityName}}`,
	    });
	  }
	}


	class CommandAbilityMaker extends MacroMaker {
	  constructor(command, options, newName, roll20) {
	    super(roll20);
	    this.command = command;
	    this.options = options;
	    this.newName = newName;
	  }

	  run(character) {
	    return this.getAbilityMaker(character)({
	      name: this.newName,
	      action: `!${this.command} ${utils.toOptionsString(this.options)}`,
	    });
	  }
	}

	class MultiCommandAbilityMaker extends MacroMaker {
	  constructor(commandSpecs, roll20) {
	    super(roll20);
	    this.commandSpecs = commandSpecs;
	  }

	  run(character) {
	    const abilMaker = this.getAbilityMaker(character);
	    return this.commandSpecs.map(cmdSpec =>
	      abilMaker({
	        name: cmdSpec.abilityName,
	        action: `!${cmdSpec.command} ${utils.toOptionsString(cmdSpec.options)}`,
	      })
	    );
	  }
	}

	class RepeatingSectionMacroMaker extends MacroMaker {
	  constructor(abilityName, repeatingSection, macroName, roll20) {
	    super(roll20);
	    this.abilityName = abilityName;
	    this.repeatingSection = repeatingSection;
	    this.macroName = macroName;
	    this.sortKey = 'originalOrder';
	  }

	  run(character) {
	    if (!_.isEmpty(this.roll20.getRepeatingSectionAttrs(character.id, this.repeatingSection))) {
	      return this.getAbilityMaker(character)({
	        name: this.macroName,
	        action: `%{${character.id}|${this.abilityName}}`,
	      });
	    }
	    return `${this.macroName}: Not present for character`;
	  }
	}

	function getRepeatingSectionAbilityLookup(sectionName, rollName, roll20) {
	  return function repeatingSectionAbilityLookup(optionName, existingOptions) {
	    const characterId = existingOptions.selected.character[0].id;
	    const cache = existingOptions.getCache(characterId);

	    cache[sectionName] = cache[sectionName] || roll20.getRepeatingSectionItemIdsByName(characterId, sectionName);

	    const repeatingId = cache[sectionName][optionName.toLowerCase()];

	    if (repeatingId) {
	      return new RollAbilityMaker(`repeating_${sectionName}_${repeatingId}_${rollName}`,
	        utils.toTitleCase(optionName), roll20);
	    }
	    return undefined;
	  };
	}

	module.exports = class AbilityMaker extends ShapedModule {
	  addCommands(commandProcessor) {
	    const roll20 = this.roll20;
	    this.staticAbilityOptions = {
	      DELETE: new AbilityDeleter(roll20),
	      advantageTracker: new MultiCommandAbilityMaker([
	        { command: 'shaped-at', options: ['advantage'], abilityName: 'Advantage' },
	        { command: 'shaped-at', options: ['disadvantage'], abilityName: 'Disadvantage' },
	        { command: 'shaped-at', options: ['normal'], abilityName: 'Normal' },
	      ], roll20),
	      advantageTrackerShort: new MultiCommandAbilityMaker([
	        { command: 'shaped-at', options: ['advantage'], abilityName: 'Adv' },
	        { command: 'shaped-at', options: ['disadvantage'], abilityName: 'Dis' },
	        { command: 'shaped-at', options: ['normal'], abilityName: 'Normal' },
	      ], roll20),
	      advantageTrackerShortest: new MultiCommandAbilityMaker([
	        { command: 'shaped-at', options: ['advantage'], abilityName: 'Adv' },
	        { command: 'shaped-at', options: ['disadvantage'], abilityName: 'Dis' },
	      ], roll20),
	      advantageTrackerQuery: new CommandAbilityMaker('shaped-at',
	        ['?{Roll Option|Normal,normal|w/ Advantage,advantage|w/ Disadvantage,disadvantage}'], '(dis)Adv Query', roll20),
	      initiative: new RollAbilityMaker('shaped_initiative', 'Init', roll20),
	      abilityChecks: new RollAbilityMaker('shaped_ability_checks', 'Ability Checks', roll20),
	      abilityChecksQuery: new RollAbilityMaker('shaped_ability_checks_query', 'Ability Checks', roll20),
	      abilChecks: new RollAbilityMaker('shaped_ability_checks', 'AbilChecks', roll20),
	      abilChecksQuery: new RollAbilityMaker('shaped_ability_checks_query', 'AbilChecks', roll20),
	      savingThrows: new RollAbilityMaker('shaped_saving_throw', 'Saving Throws', roll20),
	      savingThrowsQuery: new RollAbilityMaker('shaped_saving_throw_query', 'Saving Throws', roll20),
	      saves: new RollAbilityMaker('shaped_saving_throw', 'Saves', roll20),
	      savesQuery: new RollAbilityMaker('shaped_saving_throw_query', 'Saves', roll20),
	      rests: new CommandAbilityMaker('shaped-rest', [{ name: 'type', value: '?{Rest type|Short,short|Long,long}' }],
	        'Rests', roll20),
	      attacks: new RepeatingAbilityMaker('attack', 'attack', 'Attacks', true, roll20),
	      attacksMacro: new RepeatingSectionMacroMaker('shaped_attacks', 'attack', 'Attacks', roll20),
	      spells: new RepeatingSectionMacroMaker('shaped_spells', 'spell', 'Spells', roll20),
	      statblock: new RollAbilityMaker('shaped_statblock', 'Statblock', roll20),
	      traits: new RepeatingAbilityMaker('trait', 'trait', 'Traits', false, roll20),
	      traitsMacro: new RepeatingSectionMacroMaker('shaped_traits', 'trait', 'Traits', roll20),
	      racialFeatures: new RepeatingAbilityMaker('racialfeature', 'action', 'Racial Features', false, roll20),
	      racialFeaturesMacro: new RepeatingSectionMacroMaker('shaped_racialfeatures', 'racialfeature', 'Racial Features',
	        roll20),
	      classFeatures: new RepeatingAbilityMaker('classfeature', 'action', 'Class Features', false, roll20),
	      classFeaturesMacro: new RepeatingSectionMacroMaker('shaped_classfeatures', 'classfeature', 'Class Features',
	        roll20),
	      feats: new RepeatingAbilityMaker('feat', 'action', 'Feats', false, roll20),
	      featsMacro: new RepeatingSectionMacroMaker('shaped_feats', 'feat', 'Feats', roll20),
	      actions: new RepeatingAbilityMaker('action', 'action', 'Actions', true, roll20),
	      actionsMacro: new RepeatingSectionMacroMaker('shaped_actions', 'action', 'Actions', roll20),
	      reactions: new RepeatingAbilityMaker('reaction', 'action', 'Reactions', false, roll20),
	      reactionsMacro: new RepeatingSectionMacroMaker('shaped_reactions', 'reaction', 'Reactions', roll20),
	      legendaryActions: new RepeatingAbilityMaker('legendaryaction', 'action', 'Legendary Actions', true, roll20),
	      legendaryActionsMacro: new RepeatingSectionMacroMaker('shaped_legendaryactions', 'legendaryaction',
	        'Legendary Actions', roll20),
	      legendaryA: new RepeatingSectionMacroMaker('shaped_legendaryactions', 'legendaryaction',
	        'LegendaryA', roll20),
	      lairActions: new RepeatingSectionMacroMaker('shaped_lairactions', 'lairaction', 'Lair Actions', roll20),
	      lairA: new RepeatingSectionMacroMaker('shaped_lairactions', 'lairaction', 'LairA', roll20),
	      regionalEffects: new RepeatingSectionMacroMaker('shaped_regionaleffects', 'regionaleffect',
	        'Regional Effects', roll20),
	      regionalE: new RepeatingSectionMacroMaker('shaped_regionaleffects', 'regionaleffect', 'RegionalE', roll20),
	    };


	    return commandProcessor.addCommand('abilities', this.addAbility.bind(this), false)
	      .withSelection({
	        character: {
	          min: 1,
	          max: Infinity,
	        },
	      })
	      .optionLookup('abilities', this.staticAbilityOptions)
	      .optionLookup('abilities', getRepeatingSectionAbilityLookup('spell0', 'spell', this.roll20))
	      .optionLookup('abilities', getRepeatingSectionAbilityLookup('spell1', 'spell', this.roll20))
	      .optionLookup('abilities', getRepeatingSectionAbilityLookup('spell2', 'spell', this.roll20))
	      .optionLookup('abilities', getRepeatingSectionAbilityLookup('spell3', 'spell', this.roll20))
	      .optionLookup('abilities', getRepeatingSectionAbilityLookup('spell4', 'spell', this.roll20))
	      .optionLookup('abilities', getRepeatingSectionAbilityLookup('spell5', 'spell', this.roll20))
	      .optionLookup('abilities', getRepeatingSectionAbilityLookup('spell6', 'spell', this.roll20))
	      .optionLookup('abilities', getRepeatingSectionAbilityLookup('spell7', 'spell', this.roll20))
	      .optionLookup('abilities', getRepeatingSectionAbilityLookup('spell8', 'spell', this.roll20))
	      .optionLookup('abilities', getRepeatingSectionAbilityLookup('spell9', 'spell', this.roll20))
	      .optionLookup('abilities', getRepeatingSectionAbilityLookup('trait', 'trait', this.roll20))
	      .option('mark', ShapedConfig.booleanValidator);
	  }

	  addAbilitiesByName(abilities, character, showRecharges) {
	    const caches = {};
	    const options = {
	      getCache(key) {
	        return (caches[key] = caches[key] || {});
	      },
	      showRecharges,
	    };
	    // Slightly backwards way of doing this that ensures that we run the items in the order they are listed above
	    // rather than the order they are passed in the parameter. Ideally we'd allow users to configure this but
	    // since we haven't implemented that functionality the order is determine by the order in the saved configuration
	    // object which is quite hard to control.
	    _.chain(this.staticAbilityOptions)
	      .pick((value, key) => _.contains(abilities, key))
	      .each(abilityMaker => abilityMaker.run(character, options));
	  }

	  addAbility(options) {
	    if (_.isEmpty(options.abilities)) {
	      this.reportError('No abilities specified. ' +
	        'Take a look at the documentation for a list of ability options.');
	      return;
	    }
	    const messages = _.map(options.selected.character, (character) => {
	      const operationMessages = _.chain(options.abilities)
	        .sortBy('sortKey')
	        .map(maker => maker.run(character, options))
	        .value();


	      if (_.isEmpty(operationMessages)) {
	        return `<li>${character.get('name')}: Nothing to do</li>`;
	      }

	      let message;
	      message = `<li>Configured the following abilities for character ${character.get('name')}:<ul><li>`;
	      message += operationMessages.join('</li><li>');
	      message += '</li></ul></li>';

	      return message;
	    });

	    this.reportPlayer('Ability Creation', `<ul>${messages.join('')}</ul>`);
	  }
	};


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);

	module.exports = class ShapedConfig {

	  static get configToAttributeLookup() {
	    const lookup = {
	      sheetOutput: 'output_option',
	      deathSaveOutput: 'death_save_output_option',
	      initiativeOutput: 'initiative_output_option',
	      hitDiceOutput: 'hit_dice_output_option',
	      showNameOnRollTemplate: 'show_character_name',
	      rollOptions: 'shaped_d20',
	      initiativeRoll: 'initiative_roll',
	      initiativeToTracker: 'initiative_to_tracker',
	      breakInitiativeTies: 'initiative_tie_breaker',
	      showTargetAC: 'attacks_vs_target_ac',
	      showTargetName: 'attacks_vs_target_name',
	      autoAmmo: 'ammo_auto_use',
	      autoRevertAdvantage: 'auto_revert_advantage',
	      showRests: 'show_rests',
	      savingThrowsHalfProf: 'saving_throws_half_proficiency',
	      mediumArmorMaxDex: 'medium_armor_max_dex',
	      spellsTextSize: 'spells_text_size',
	      abilityChecksTextSize: 'ability_checks_text_size',
	      savingThrowsTextSize: 'saving_throws_text_size',
	      baseDC: 'base_dc',
	      tab: 'tab',
	      useCustomSaves: 'use_custom_saving_throws',
	      useAverageOfAbilities: 'average_of_abilities',
	      expertiseAsAdvantage: 'expertise_as_advantage',
	      hideAttack: 'hide_attack',
	      hideDamage: 'hide_damage',
	      hideAbilityChecks: 'hide_ability_checks',
	      hideSavingThrows: 'hide_saving_throws',
	      hideSavingThrowDC: 'hide_saving_throw_dc',
	      hideSpellContent: 'hide_spell_content',
	      hideFreetext: 'hide_freetext',
	      hideSavingThrowFailure: 'hide_saving_throw_failure',
	      hideSavingThrowSuccess: 'hide_saving_throw_success',
	      hideRecharge: 'hide_recharge',
	      hideCost: 'hide_cost',
	      customSkills: 'custom_skills',
	      showPassiveSkills: 'show_passive_skills',
	      showWeight: 'show_weight',
	      showEmote: 'show_emote',
	      showFreetext: 'show_freetext',
	      showFreeform: 'show_freeform',
	      showDiceModifiers: 'show_dice_modifiers',
	      showCritRange: 'show_crit_range',
	      extraOnACrit: 'extra_on_a_crit',
	      inspirationMultiple: 'inspiration_multiple',
	      criticalDamageHouserule: 'critical_damage_houserule',
	      proficiencyDice: 'proficiency_dice',
	      psionics: 'psionics',
	      customClasses: 'custom_classes',
	      honorToggle: 'honor_toggle',
	      sanityToggle: 'sanity_toggle',
	      distanceSystem: 'distance_system',
	      weightSystem: 'weight_system',
	      encumbranceMultiplier: 'encumbrance_multiplier',
	      automaticHigherLevelQueries: 'automatic_higher_level_queries',
	    };

	    ['fortitude', 'reflex', 'will'].forEach((save) => {
	      ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'].forEach((ability) => {
	        lookup[`${save}${ability}`] = `${save}_${ability.toLowerCase()}`;
	      });
	    });

	    return lookup;
	  }

	  static booleanValidator(value) {
	    const converted = value === 'true' || (value === 'false' ? false : value);
	    return {
	      valid: typeof value === 'boolean' || value === 'true' || value === 'false',
	      converted,
	    };
	  }

	  static stringValidator(value) {
	    return {
	      valid: true,
	      converted: value,
	    };
	  }

	  static arrayValidator(value) {
	    return {
	      valid: true,
	      converted: value.split(',').map(s => s.trim()),
	    };
	  }

	  static getOptionList(options) {
	    return function optionList(value) {
	      if (value === undefined) {
	        return options;
	      }
	      return {
	        converted: options[value],
	        valid: options[value] !== undefined,
	      };
	    };
	  }

	  static getHideOption(propertyName) {
	    return this.getOptionList({ false: '***default***', true: `{{${propertyName}=1}}` });
	  }

	  static integerValidator(value) {
	    const parsed = parseInt(value, 10);
	    return {
	      converted: parsed,
	      valid: !isNaN(parsed),
	    };
	  }

	  static floatValidator(value) {
	    const parsed = parseFloat(value);
	    return {
	      converted: parsed,
	      valid: !isNaN(parsed),
	    };
	  }

	  static colorValidator(value) {
	    return {
	      converted: value,
	      valid: /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(value),
	    };
	  }

	  static get sheetOutputValidator() {
	    return this.getOptionList({
	      public: '***default***',
	      whisper: '/w GM',
	    });
	  }

	  static get rollOutputValidator() {
	    return this.getOptionList({
	      sheetStandard: '***default***',
	      public: '',
	      whisper: '/w GM',
	    });
	  }

	  static get commandOutputValidator() {
	    return this.getOptionList({
	      public: 'public',
	      whisper: 'whisper',
	      silent: 'silent',
	    });
	  }

	  static get statusMarkerValidator() {
	    return this.getOptionList(ShapedConfig.validStatusMarkers());
	  }

	  static get barValidator() {
	    return {
	      attribute: this.stringValidator,
	      max: this.booleanValidator,
	      link: this.booleanValidator,
	      showPlayers: this.booleanValidator,
	    };
	  }

	  static get auraValidator() {
	    return {
	      radius: this.stringValidator,
	      color: this.colorValidator,
	      square: this.booleanValidator,
	    };
	  }

	  static get lightValidator() {
	    return {
	      radius: this.stringValidator,
	      dimRadius: this.stringValidator,
	      otherPlayers: this.booleanValidator,
	      hasSight: this.booleanValidator,
	      angle: this.integerValidator,
	      losAngle: this.integerValidator,
	      multiplier: this.integerValidator,
	    };
	  }

	  static getCharacterValidator(roll20) {
	    return function characterValidator(value) {
	      const char = roll20.getObj('character', value);
	      return {
	        converted: char,
	        valid: !!char,
	      };
	    };
	  }

	  static get spellSearchOptions() {
	    return {
	      classes: this.arrayValidator,
	      domains: this.arrayValidator,
	      oaths: this.arrayValidator,
	      patrons: this.arrayValidator,
	      school: this.stringValidator,
	      level: this.integerValidator,
	    };
	  }


	  static regExpValidator(value) {
	    try {
	      new RegExp(value, 'i').test('');
	      return {
	        converted: value,
	        valid: true,
	      };
	    }
	    catch (e) {
	      return {
	        converted: null,
	        valid: false,
	      };
	    }
	  }

	  static get configOptionsSpec() {
	    return {
	      tokenSettings: {
	        monsterTokenName: this.stringValidator,
	        number: this.booleanValidator,
	        bar1: this.barValidator,
	        bar2: this.barValidator,
	        bar3: this.barValidator,
	        aura1: this.auraValidator,
	        aura2: this.auraValidator,
	        light: this.lightValidator,
	        showName: this.booleanValidator,
	        showNameToPlayers: this.booleanValidator,
	        showAura1ToPlayers: this.booleanValidator,
	        showAura2ToPlayers: this.booleanValidator,
	      },
	      newCharSettings: {
	        applyToAll: this.booleanValidator,
	        sheetOutput: this.sheetOutputValidator,
	        deathSaveOutput: this.rollOutputValidator,
	        hitDiceOutput: this.rollOutputValidator,
	        initiativeOutput: this.rollOutputValidator,
	        showNameOnRollTemplate: this.getOptionList({
	          true: '{{show_character_name=1}}',
	          false: '***default***',
	        }),
	        rollOptions: this.getOptionList({
	          normal: '***default***',
	          advantage: '2d20kh1',
	          disadvantage: '2d20kl1',
	          query: '?{Roll|Normal,d20|Advantage,2d20kh1|Disadvantage,2d20kl1}',
	          advantageQuery: '?{Disadvantaged|No,2d20kh1|Yes,d20}',
	          disadvantageQuery: '?{Advantaged|No,2d20kl1|Yes,d20}',
	          two: '1d20',
	        }),
	        initiativeRoll: this.getOptionList({
	          normal: '***default***',
	          advantage: '2d20@{d20_mod}kh1',
	          disadvantage: '2d20@{d20_mod}kl1',
	        }),
	        initiativeToTracker: this.getOptionList({
	          true: '***default***',
	          false: 0,
	        }),
	        breakInitiativeTies: this.booleanValidator,
	        showTargetAC: this.booleanValidator,
	        showTargetName: this.booleanValidator,
	        autoAmmo: this.booleanValidator,
	        autoRevertAdvantage: this.booleanValidator,
	        automaticHigherLevelQueries: this.getOptionList({
	          true: '***default***',
	          false: 0,
	        }),
	        display: {
	          showRests: this.booleanValidator,
	          showPassiveSkills: this.booleanValidator,
	          showWeight: this.getOptionList({
	            true: '***default***',
	            false: 0,
	          }),
	          showEmote: this.booleanValidator,
	          showFreetext: this.booleanValidator,
	          showFreeform: this.booleanValidator,
	          showDiceModifiers: this.booleanValidator,
	          showCritRange: this.booleanValidator,
	          extraOnACrit: this.booleanValidator,
	        },
	        measurementSystems: {
	          distanceSystem: this.getOptionList({
	            feet: '***default***',
	            meters: 'METERS',
	          }),
	          weightSystem: this.getOptionList({
	            pounds: '***default***',
	            kilograms: 'KILOGRAMS',
	          }),
	          encumbranceMultiplier: this.floatValidator,
	        },
	        houserules: {
	          inspirationMultiple: this.booleanValidator,
	          criticalDamageHouserule: this.getOptionList({
	            normal: '***default***',
	            criticalDamageIsMaximized: 'CRITICAL_DAMAGE_IS_MAXIMIZED',
	            noCriticalDamageFromDefaultDamage: 'NO_CRITICAL_DAMAGE_FROM_DEFAULT_DAMAGE',
	          }),
	          proficiencyDice: this.booleanValidator,
	          psionics: this.booleanValidator,
	          customClasses: this.booleanValidator,
	          honorToggle: this.booleanValidator,
	          sanityToggle: this.booleanValidator,
	          baseDC: this.getOptionList(_.range(0, 21).reduce((result, val) => {
	            result[val] = val === 8 ? '***default***' : val;
	            return result;
	          }, {})),
	          mediumArmorMaxDex: this.getOptionList(_.range(0, 11).reduce((result, val) => {
	            result[val] = val === 2 ? '***default***' : val;
	            return result;
	          }, {})),
	          expertiseAsAdvantage: this.booleanValidator,
	          saves: {
	            savingThrowsHalfProf: this.booleanValidator,
	            useCustomSaves: this.booleanValidator,
	            useAverageOfAbilities: this.booleanValidator,
	            fortitude: {
	              fortitudeStrength: this.booleanValidator,
	              fortitudeDexterity: this.booleanValidator,
	              fortitudeConstitution: this.booleanValidator,
	              fortitudeIntelligence: this.booleanValidator,
	              fortitudeWisdom: this.booleanValidator,
	              fortitudeCharisma: this.booleanValidator,
	            },
	            reflex: {
	              reflexStrength: this.booleanValidator,
	              reflexDexterity: this.booleanValidator,
	              reflexConstitution: this.booleanValidator,
	              reflexIntelligence: this.booleanValidator,
	              reflexWisdom: this.booleanValidator,
	              reflexCharisma: this.booleanValidator,
	            },
	            will: {
	              willStrength: this.booleanValidator,
	              willDexterity: this.booleanValidator,
	              willConstitution: this.booleanValidator,
	              willIntelligence: this.booleanValidator,
	              willWisdom: this.booleanValidator,
	              willCharisma: this.booleanValidator,
	            },
	          },
	        },
	        tab: this.getOptionList({
	          core: '***default***',
	          character: 'character',
	          settings: 'settings',
	          all: 'all',
	        }),
	        tokenActions: {
	          initiative: this.booleanValidator,
	          abilityChecks: this.getOptionList({
	            none: null,
	            query: 'abilityChecksQuery',
	            chatWindow: 'abilityChecks',
	            queryShort: 'abilChecksQuery',
	            chatWindowShort: 'abilChecks',
	          }),
	          advantageTracker: this.getOptionList({
	            none: null,
	            normal: 'advantageTracker',
	            short: 'advantageTrackerShort',
	            shortest: 'advantageTrackerShortest',
	            query: 'advantageTrackerQuery',
	          }),
	          savingThrows: this.getOptionList({
	            none: null,
	            query: 'savingThrowsQuery',
	            chatWindow: 'savingThrows',
	            queryShort: 'savesQuery',
	            chatWindowShort: 'saves',
	          }),
	          attacks: this.getOptionList({
	            none: null,
	            individualActions: 'attacks',
	            chatWindow: 'attacksMacro',
	          }),
	          statblock: this.booleanValidator,
	          traits: this.getOptionList({
	            none: null,
	            individualActions: 'traits',
	            chatWindow: 'traitsMacro',
	          }),
	          racialFeatures: this.getOptionList({
	            none: null,
	            individualActions: 'racialFeatures',
	            chatWindow: 'racialFeaturesMacro',
	          }),
	          classFeatures: this.getOptionList({
	            none: null,
	            individualActions: 'classFeatures',
	            chatWindow: 'classFeaturesMacro',
	          }),
	          feats: this.getOptionList({
	            none: null,
	            individualActions: 'feats',
	            chatWindow: 'featsMacro',
	          }),
	          actions: this.getOptionList({
	            none: null,
	            individualActions: 'actions',
	            chatWindow: 'actionsMacro',
	          }),
	          spells: this.booleanValidator,
	          reactions: this.getOptionList({
	            none: null,
	            individualActions: 'reactions',
	            chatWindow: 'reactionsMacro',
	          }),
	          legendaryActions: this.getOptionList({
	            none: null,
	            individualActions: 'legendaryActions',
	            chatWindow: 'legendaryActionsMacro',
	            chatWindowShort: 'legendaryA',
	          }),
	          lairActions: this.getOptionList({
	            none: null,
	            chatWindow: 'lairActions',
	            chatWindowShort: 'lairA',
	          }),
	          regionalEffects: this.getOptionList({
	            none: null,
	            chatWindow: 'regionalEffects',
	            chatWindowShort: 'regionalE',
	          }),
	          rests: this.booleanValidator,
	          showRecharges: this.booleanValidator,
	        },
	        textSizes: {
	          spellsTextSize: this.getOptionList({
	            normal: '***default***',
	            big: 'big',
	          }),
	          abilityChecksTextSize: this.getOptionList({
	            normal: '***default***',
	            big: 'text_big',
	          }),
	          savingThrowsTextSize: this.getOptionList({
	            normal: '***default***',
	            big: 'text_big',
	          }),
	        },
	        hide: {
	          hideAbilityChecks: this.getHideOption('hide_ability_checks'),
	          hideSavingThrows: this.getHideOption('hide_saving_throws'),
	          hideAttack: this.getHideOption('hide_attack'),
	          hideDamage: this.getHideOption('hide_damage'),
	          hideFreetext: this.getHideOption('hide_freetext'),
	          hideRecharge: this.getHideOption('hide_recharge'),
	          hideCost: this.getHideOption('hide_cost'),
	          hideSavingThrowDC: this.getHideOption('hide_saving_throw_dc'),
	          hideSavingThrowFailure: this.getHideOption('hide_saving_throw_failure'),
	          hideSavingThrowSuccess: this.getHideOption('hide_saving_throw_success'),
	          hideSpellContent: this.getHideOption('hide_spell_content'),
	        },
	        customSkills: this.stringValidator,
	      },
	      advTrackerSettings: {
	        showMarkers: this.booleanValidator,
	        ignoreNpcs: this.booleanValidator,
	        advantageMarker: this.statusMarkerValidator,
	        disadvantageMarker: this.statusMarkerValidator,
	        output: this.commandOutputValidator,
	      },
	      sheetEnhancements: {
	        rollHPOnDrop: this.booleanValidator,
	        autoHD: this.booleanValidator,
	        autoSpellSlots: this.booleanValidator,
	        autoTraits: this.booleanValidator,
	      },
	      genderPronouns: [
	        {
	          matchPattern: this.regExpValidator,
	          nominative: this.stringValidator,
	          accusative: this.stringValidator,
	          possessive: this.stringValidator,
	          reflexive: this.stringValidator,
	        },
	      ],
	      defaultGenderIndex: this.integerValidator,
	      variants: {
	        rests: {
	          longNoHpFullHd: this.booleanValidator,
	        },
	      },
	    };
	  }

	  static validStatusMarkers() {
	    const markers = [
	      'red', 'blue', 'green', 'brown', 'purple', 'pink', 'yellow', 'dead', 'skull', 'sleepy',
	      'half-heart', 'half-haze', 'interdiction', 'snail', 'lightning-helix', 'spanner', 'chained-heart',
	      'chemical-bolt', 'death-zone', 'drink-me', 'edge-crack', 'ninja-mask', 'stopwatch', 'fishing-net', 'overdrive',
	      'strong', 'fist', 'padlock', 'three-leaves', 'fluffy-wing', 'pummeled', 'tread', 'arrowed', 'aura',
	      'back-pain', 'black-flag', 'bleeding-eye', 'bolt-shield', 'broken-heart', 'cobweb', 'broken-shield',
	      'flying-flag', 'radioactive', 'trophy', 'broken-skull', 'frozen-orb', 'rolling-bomb', 'white-tower',
	      'grab', 'screaming', 'grenade', 'sentry-gun', 'all-for-one', 'angel-outfit', 'archery-target',
	    ];

	    const obj = {};
	    for (let i = 0; i < markers.length; i++) {
	      obj[markers[i]] = markers[i];
	    }

	    return obj;
	  }
	};



/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);
	const utils = __webpack_require__(7);
	const ShapedModule = __webpack_require__(14);
	const ShapedConfig = __webpack_require__(17);

	class ConfigUi extends ShapedModule {

	  addCommands(commandProcessor) {
	    const menus = {
	      atMenu: new AdvantageTrackerMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      tsMenu: new TokensMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      barMenu: new TokenBarsMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      auraMenu: new TokenAurasMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      ncMenu: new NewCharacterMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      taMenu: new TokenActionsMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      hideMenu: new HideMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      hrMenu: new NewCharacterHouseruleMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      savesMenu: new SavesMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      fortitudeMenu: new CustomSaveTypeMenu(this.myState.config, ShapedConfig.configOptionsSpec, 'fortitude'),
	      reflexMenu: new CustomSaveTypeMenu(this.myState.config, ShapedConfig.configOptionsSpec, 'reflex'),
	      willMenu: new CustomSaveTypeMenu(this.myState.config, ShapedConfig.configOptionsSpec, 'will'),
	      textMenu: new NewCharacterTextSizeMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      varsMenu: new VariantsMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      seMenu: new SheetEnhancementsMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      displayMenu: new DisplayMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      msMenu: new MeasurementSystemsMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	      initMenu: new InitiativeMenu(this.myState.config, ShapedConfig.configOptionsSpec),
	    };

	    _.each(menus, menu => this.logger.wrapModule(menu));

	    return commandProcessor.addCommand('config', this.process.bind(this), true)
	      .options(ShapedConfig.configOptionsSpec)
	      .optionLookup('menu', menus);
	  }

	  process(options) {
	    // drop "menu" options
	    utils.deepExtend(this.myState.config, _.omit(options, 'menu'));

	    if (options.menu) {
	      this.reportPlayer('Configuration', options.menu[0].getMenu());
	    }
	    else {
	      const menu = new MainMenu(this.myState.config, ShapedConfig.configOptionsSpec);
	      this.reportPlayer('Configuration', menu.getMenu());
	    }
	  }
	}

	module.exports = ConfigUi;

	/////////////////////////////////////////////////
	// Menu Base
	/////////////////////////////////////////////////
	class ConfigMenu {
	  constructor(config, specRoot) {
	    this.config = config;
	    this.specRoot = specRoot;
	  }

	  makeToggleSetting(params) {
	    let currentVal = utils.getObjectFromPath(this.config, params.path);
	    if (params.spec) {
	      currentVal = _.invert(params.spec)[currentVal] === 'true';
	    }

	    params.command = `${!currentVal}${!_.isUndefined(params.menuCmd) ? ` --${params.menuCmd}` : ''}`;
	    params.linkText = this.makeBoolText(currentVal);
	    params.tooltip = 'click to toggle';
	    params.buttonColor = currentVal ? '#65c4bd' : '#f84545';

	    return this.makeOptionRow(params);
	  }

	  makeQuerySetting(params) {
	    const currentVal = _.invert(params.spec)[utils.getObjectFromPath(this.config, params.path)];
	    const cmd = this.getQueryCommand(params.path, params.title, params.spec);

	    params.command = `${cmd}${!_.isUndefined(params.menuCmd) ? ` --${params.menuCmd}` : ''}`;
	    params.linkText = this.makeText(currentVal);
	    params.tooltip = 'click to change';
	    params.buttonColor = '#02baf2';

	    return this.makeOptionRow(params);
	  }

	  makeInputSetting(params) {
	    const currentVal = utils.getObjectFromPath(this.config, params.path);

	    params.command = `?{${params.prompt}|${currentVal}}${!_.isUndefined(params.menuCmd) ? ` --${params.menuCmd}` : ''}`;
	    params.linkText = currentVal || '[not set]';
	    params.tooltip = 'click to edit';
	    params.buttonColor = params.linkText === '[not set]' ? '#f84545' : '#02baf2';

	    return this.makeOptionRow(params);
	  }

	  // noinspection JSUnusedGlobalSymbols
	  makeColorSetting(params) {
	    const currentVal = utils.getObjectFromPath(this.config, params.path);

	    params.command = `?{${params.prompt}|${currentVal}}${!_.isUndefined(params.menuCmd) ? ` --${params.menuCmd}` : ''}`;
	    params.linkText = currentVal || '[not set]';
	    params.tooltip = 'click to edit';
	    params.buttonColor = params.linkText === '[not set]' ? '#02baf2' : currentVal;
	    params.buttonTextColor = utils.getContrastYIQ(params.buttonColor);

	    return this.makeOptionRow(params);
	  }

	  backToMainMenuButton() {
	    return utils.buildHTML('a', '&lt;-- Main Menu', {
	      href: '!shaped-config',
	      style: 'text-align: center; margin: 5px 0 0 0; padding: 2px 2px ; border-radius: 10px; white-space: nowrap; ' +
	      'overflow: hidden; text-overflow: ellipsis; background-color: #02baf2; border-color: #c0c0c0;',
	    });
	  }

	  backToTokenOptions() {
	    return utils.buildHTML('a', '&lt;-- Token Options', {
	      href: '!shaped-config --tsMenu',
	      style: 'text-align: center; margin: 5px 0 0 0; padding: 2px 2px ; border-radius: 10px; white-space: nowrap; ' +
	      'overflow: hidden; text-overflow: ellipsis; background-color: #02baf2; border-color: #c0c0c0;',
	    });
	  }

	  backToNewCharOptions() {
	    return utils.buildHTML('a', '&lt;-- New Character Options', {
	      href: '!shaped-config --ncMenu',
	      style: 'text-align: center; margin: 5px 0 0 0; padding: 2px 2px ; border-radius: 10px; white-space: nowrap; ' +
	      'overflow: hidden; text-overflow: ellipsis; background-color: #02baf2; border-color: #c0c0c0;',
	    });
	  }

	  backToHouseRuleOptions() {
	    return utils.buildHTML('a', '&lt;-- Houserule Options', {
	      href: '!shaped-config --hrMenu',
	      style: 'text-align: center; margin: 5px 0 0 0; padding: 2px 2px ; border-radius: 10px; white-space: nowrap; ' +
	      'overflow: hidden; text-overflow: ellipsis; background-color: #02baf2; border-color: #c0c0c0;',
	    });
	  }

	  backToSavesOptions() {
	    return utils.buildHTML('a', '&lt;-- Saves Options', {
	      href: '!shaped-config --savesMenu',
	      style: 'text-align: center; margin: 5px 0 0 0; padding: 2px 2px ; border-radius: 10px; white-space: nowrap; ' +
	      'overflow: hidden; text-overflow: ellipsis; background-color: #02baf2; border-color: #c0c0c0;',
	    });
	  }

	  getQueryCommand(path, title, optionsSpec) {
	    let currentVal = _.invert(optionsSpec)[utils.getObjectFromPath(this.config, path)];
	    const optionList = _.keys(optionsSpec);

	    // Fix up if we've somehow ended up with an illegal value
	    if (_.isUndefined(currentVal)) {
	      currentVal = _.first(optionList);
	      utils.deepExtend(this.config, utils.createObjectFromPath(path, optionsSpec[currentVal]));
	    }

	    // move the current option to the front of the list
	    optionList.splice(optionList.indexOf(currentVal), 1);
	    optionList.unshift(currentVal);

	    return `?{${title}|${optionList.join('|')}}`;
	  }

	  makeOptionRow(params) {
	    const col1 = utils.buildHTML('td', params.title);
	    const col2 = utils.buildHTML('td', this.makeOptionButton(params), { style: 'text-align:right;' });

	    return utils.buildHTML('tr', col1 + col2, { style: 'border: 1px solid gray;' });
	  }

	  makeOptionButton(params) {
	    if (_.isUndefined(params.width)) {
	      params.width = 80;
	    }

	    let css = `text-align: center; width: ${params.width}px; margin: 2px 0 -3px 0; ` +
	      'padding: 2px 2px ; border-radius: 10px; border-color: #c0c0c0;' +
	      `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background-color: ${params.buttonColor};`;
	    if (params.buttonTextColor) {
	      css += `color: ${params.buttonTextColor}`;
	    }

	    return utils.buildHTML('a', params.linkText, {
	      style: css,
	      href: `!shaped-config --${params.path} ${params.command}`,
	    });
	  }

	  makeText(value) {
	    return utils.buildHTML('span', value, { style: 'padding: 0 2px;' });
	  }

	  makeBoolText(value) {
	    return value === true ?
	      utils.buildHTML('span', 'on', { style: 'padding: 0 2px;' }) :
	      utils.buildHTML('span', 'off', { style: 'padding: 0 2px;' });
	  }

	  /* eslint-disable object-property-newline */
	  makeThreeColOptionTable(options) {
	    return utils
	      .buildHTML('tr', [
	        {
	          tag: 'td',
	          innerHtml: [
	            {
	              tag: 'table',
	              innerHtml: [
	                {
	                  tag: 'tr',
	                  innerHtml: [{ tag: 'th', innerHtml: options.tableTitle, attrs: { colspan: 3 } }],
	                },
	                {
	                  tag: 'tr',
	                  innerHtml: [
	                    {
	                      tag: 'td',
	                      innerHtml: options.colTitles[0],
	                    },
	                    {
	                      tag: 'td',
	                      innerHtml: options.colTitles[1],
	                    },
	                    {
	                      tag: 'td',
	                      innerHtml: options.colTitles[2],
	                    },
	                  ],
	                  attrs: { style: 'line-height: 1;' },
	                },
	                {
	                  tag: 'tr',
	                  innerHtml: [
	                    {
	                      tag: 'td',
	                      innerHtml: options.buttons[0],
	                    },
	                    {
	                      tag: 'td',
	                      innerHtml: options.buttons[1],
	                    },
	                    {
	                      tag: 'td',
	                      innerHtml: options.buttons[2],
	                    },
	                  ],
	                },
	                {
	                  tag: 'tr',
	                  innerHtml: [
	                    {
	                      tag: 'td',
	                      innerHtml: options.colTitles[3],
	                    },
	                  ],
	                  attrs: { style: 'line-height: 1;' },
	                },
	                {
	                  tag: 'tr',
	                  innerHtml: [
	                    {
	                      tag: 'td',
	                      innerHtml: options.buttons[3],
	                    },
	                  ],
	                },
	              ],
	              attrs: { style: 'width: 100%; text-align: center;' },
	            },
	          ], attrs: { colspan: '2' },
	        },
	      ], { style: 'border: 1px solid gray;' });
	  }

	  get logWrap() {
	    return this.constructor.name;
	  }

	  toJSON() {
	    return {};
	  }
	}

	/////////////////////////////////////////////////
	// Menus
	/////////////////////////////////////////////////
	class MainMenu extends ConfigMenu {
	  getMenu() {
	    const optionRows =
	      this.makeOptionRow({
	        title: 'Advantage Tracker', path: 'atMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeOptionRow({
	        title: 'Token Defaults', path: 'tsMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeOptionRow({
	        title: 'New Characters', path: 'ncMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeOptionRow({
	        title: 'Char. Sheet Enhancements', path: 'seMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeOptionRow({
	        title: 'Houserules & Variants', path: 'varsMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      });

	    const th = utils.buildHTML('th', 'Main Menu', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });

	    return utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });
	  }
	}

	class AdvantageTrackerMenu extends ConfigMenu {
	  getMenu() {
	    const ats = 'advTrackerSettings';
	    const menu = 'atMenu';

	    const optionRows =
	      this.makeQuerySetting({
	        path: `${ats}.output`, title: 'Output', menuCmd: menu,
	        spec: this.specRoot.advTrackerSettings.output(),
	      }) +
	      this.makeToggleSetting({
	        path: `${ats}.showMarkers`, title: 'Show Markers', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${ats}.ignoreNpcs`, title: 'Ignore NPCs', menuCmd: menu,
	      }) +
	      this.makeQuerySetting({
	        path: `${ats}.advantageMarker`, title: 'Advantage Marker', menuCmd: menu,
	        spec: this.specRoot.advTrackerSettings.advantageMarker(),
	      }) +
	      this.makeQuerySetting({
	        path: `${ats}.disadvantageMarker`, title: 'Disadvantage Marker', menuCmd: menu,
	        spec: this.specRoot.advTrackerSettings.disadvantageMarker(),
	      });


	    const th = utils.buildHTML('th', 'Advantage Tracker Options', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToMainMenuButton();
	  }
	}

	class TokensMenu extends ConfigMenu {
	  getMenu() { // config) {
	    // this.config = config;
	    const ts = 'tokenSettings';
	    const menu = 'tsMenu';

	    const optionRows =
	      this.makeToggleSetting({
	        path: `${ts}.number`, title: 'Numbered Tokens', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${ts}.showName`, title: 'Show Name Tag', menuCmd: menu,
	      }) +
	      this.makeInputSetting({
	        path: `${ts}.monsterTokenName`, title: 'Token name override', prompt: 'Token name override (empty to unset)',
	        menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${ts}.showNameToPlayers`, title: 'Show Name to Players', menuCmd: menu,
	      }) +
	      this.makeInputSetting({
	        path: `${ts}.light.radius`, title: 'Light Radius', prompt: 'Light Radius (empty to unset)', menuCmd: menu,
	      }) +
	      this.makeInputSetting({
	        path: `${ts}.light.dimRadius`, title: 'Dim Radius', prompt: 'Light Dim Radius (empty to unset)', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${ts}.light.otherPlayers`, title: 'Other players see light', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${ts}.light.hasSight`, title: 'Has Sight', menuCmd: menu,
	      }) +
	      this.makeInputSetting({
	        path: `${ts}.light.angle`, title: 'Light Angle', prompt: 'Light Angle', menuCmd: menu,
	      }) +
	      this.makeInputSetting({
	        path: `${ts}.light.losAngle`, title: 'LOS Angle', prompt: 'LOS Angle', menuCmd: menu,
	      }) +
	      this.makeInputSetting({
	        path: `${ts}.light.multiplier`, title: 'Light Muliplier', prompt: 'Light Muliplier', menuCmd: menu,
	      }) +
	      this.makeOptionRow({
	        title: 'Token Bar Options', path: 'barMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeOptionRow({
	        title: 'Token Aura Options', path: 'auraMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      });

	    const th = utils.buildHTML('th', 'Token Options', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToMainMenuButton();
	  }
	}

	class TokenBarsMenu extends ConfigMenu {
	  getMenu() {
	    const ts = 'tokenSettings';
	    const menu = 'barMenu';

	    let optionRows = '';

	    for (let i = 1; i <= 3; i++) {
	      const currAttr = utils.getObjectFromPath(this.config, `${ts}.bar${i}.attribute`);
	      const currAttrEmptyHint = currAttr || '[not set]';
	      const currMax = utils.getObjectFromPath(this.config, `${ts}.bar${i}.max`);
	      const currLink = utils.getObjectFromPath(this.config, `${ts}.bar${i}.link`);

	      const attBtn = this.makeOptionButton({
	        path: `${ts}.bar${i}.attribute`, linkText: this.makeText(currAttrEmptyHint), tooltip: 'click to edit',
	        buttonColor: currAttrEmptyHint === '[not set]' ? '#f84545' : '#02baf2', width: 60,
	        command: `?{Bar ${i} Attribute (empty to unset)|${currAttr}} --${menu}`,
	      });
	      const maxBtn = this.makeOptionButton({
	        path: `${ts}.bar${i}.max`, linkText: this.makeBoolText(currMax), tooltip: 'click to toggle',
	        buttonColor: currMax ? '#65c4bd' : '#f84545', width: 60,
	        command: `${!currMax} --${menu}`,
	      });
	      const linkBtn = this.makeOptionButton({
	        path: `${ts}.bar${i}.link`, linkText: this.makeBoolText(currLink), tooltip: 'click to togle',
	        buttonColor: currLink ? '#65c4bd' : '#f84545', width: 60,
	        command: `${!currLink} --${menu}`,
	      });

	      optionRows += this.makeThreeColOptionTable({
	        tableTitle: `Bar ${i}`,
	        colTitles: ['Attribute', 'Max', 'Link'],
	        buttons: [attBtn, maxBtn, linkBtn],
	      });
	    }

	    for (let i = 1; i <= 3; i++) {
	      optionRows += this.makeToggleSetting({
	        path: `${ts}.bar${i}.showPlayers`, title: `Bar ${i} Show Players`, menuCmd: 'barMenu',
	      });
	    }

	    const th = utils.buildHTML('th', 'Token Bar Options', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToTokenOptions();
	  }
	}

	class TokenAurasMenu extends ConfigMenu {
	  getMenu() {
	    const ts = 'tokenSettings';
	    const menu = 'auraMenu';

	    let optionRows = '';

	    for (let i = 1; i <= 2; i++) {
	      const currRad = utils.getObjectFromPath(this.config, `${ts}.aura${i}.radius`);
	      const currRadEmptyHint = currRad || '[not set]';
	      const currColor = utils.getObjectFromPath(this.config, `${ts}.aura${i}.color`);
	      const currSquare = utils.getObjectFromPath(this.config, `${ts}.aura${i}.square`);

	      const radBtn = this.makeOptionButton({
	        path: `${ts}.aura${i}.radius`, linkText: this.makeText(currRadEmptyHint), tooltip: 'click to edit',
	        buttonColor: currRadEmptyHint === '[not set]' ? '#f84545' : '#02baf2', width: 60,
	        command: `?{Aura ${i} Radius (empty to unset)|${currRad}} --${menu}`,
	      });
	      const colorBtn = this.makeOptionButton({
	        path: `tokenSettings.aura${i}.color`, linkText: this.makeText(currColor), tooltip: 'click to edit',
	        buttonColor: currColor, buttonTextColor: utils.getContrastYIQ(currColor), width: 60,
	        command: `?{Aura ${i} Color (hex colors)|${currColor}} --${menu}`,
	      });
	      const squareBtn = this.makeOptionButton({
	        path: `tokenSettings.aura${i}.square`, linkText: this.makeBoolText(currSquare), tooltip: 'click to toggle',
	        buttonColor: currSquare ? '#65c4bd' : '#f84545', width: 60,
	        command: `${!currSquare} --${menu}`,

	      });

	      optionRows += this.makeThreeColOptionTable({
	        tableTitle: `Aura ${i}`,
	        colTitles: ['Range', 'Color', 'Square'],
	        buttons: [radBtn, colorBtn, squareBtn],
	      });
	    }

	    for (let i = 1; i <= 2; i++) {
	      optionRows += this.makeToggleSetting({
	        path: `${ts}.showAura${i}ToPlayers`, title: `Aura ${i} Show Players`, menuCmd: 'auraMenu',
	      });
	    }

	    const th = utils.buildHTML('th', 'Token Aura Options', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToTokenOptions();
	  }
	}

	class NewCharacterMenu extends ConfigMenu {
	  getMenu() {
	    const menu = 'ncMenu';
	    const ncs = 'newCharSettings';
	    let optionRows =
	      this.makeToggleSetting({ path: `${ncs}.applyToAll`, title: 'Apply to all new chars?', menuCmd: menu });

	    const spec = this.specRoot.newCharSettings;

	    const currSheetOut =
	      _.invert(spec.sheetOutput())[utils.getObjectFromPath(this.config, `${ncs}.sheetOutput`)];
	    const currDSaveOut =
	      _.invert(spec.deathSaveOutput())[utils.getObjectFromPath(this.config, `${ncs}.deathSaveOutput`)];
	    const currHDOut =
	      _.invert(spec.hitDiceOutput())[utils.getObjectFromPath(this.config, `${ncs}.hitDiceOutput`)];


	    const sheetBtn = this.makeOptionButton({
	      path: `${ncs}.sheetOutput`, linkText: this.makeText(currSheetOut), tooltip: 'click to change',
	      buttonColor: '#02baf2', width: 60,
	      command: `${this.getQueryCommand(`${ncs}.sheetOutput`, 'Sheet Output', spec.sheetOutput())}`
	      + ` --${menu}`,
	    });
	    const dSaveBtn = this.makeOptionButton({
	      path: `${ncs}.deathSaveOutput`, linkText: this.makeText(currDSaveOut), tooltip: 'click to change',
	      buttonColor: '#02baf2', width: 60,
	      command: `${this.getQueryCommand(`${ncs}.deathSaveOutput`, 'Death Save Output', spec.deathSaveOutput())}`
	      + ` --${menu}`,
	    });
	    const hdBtn = this.makeOptionButton({
	      path: `${ncs}.hitDiceOutput`, linkText: this.makeText(currHDOut), tooltip: 'click to change',
	      buttonColor: '#02baf2', width: 60,
	      command: `${this.getQueryCommand(`${ncs}.hitDiceOutput`, 'Death Save Output', spec.hitDiceOutput())}`
	      + ` --${menu}`,
	    });


	    optionRows += this.makeThreeColOptionTable({
	      tableTitle: 'Output',
	      colTitles: ['Sheet', 'Death Save', 'Hit Dice'],
	      buttons: [sheetBtn, dSaveBtn, hdBtn],
	    });

	    optionRows +=
	      this.makeOptionRow({
	        title: 'Initiative Settings', path: 'initMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeToggleSetting({
	        path: `${ncs}.showNameOnRollTemplate`, title: 'Show Name on Roll Template', menuCmd: menu,
	        spec: spec.showNameOnRollTemplate(),
	      }) +
	      this.makeQuerySetting({
	        path: `${ncs}.rollOptions`, title: 'Roll Options', menuCmd: menu, spec: spec.rollOptions(),
	      }) +
	      this.makeToggleSetting({
	        path: `${ncs}.autoRevertAdvantage`, title: 'Revert Advantage', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${ncs}.showTargetAC`, title: 'Show Target AC', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${ncs}.showTargetName`, title: 'Show Target Name', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${ncs}.autoAmmo`, title: 'Auto Use Ammo', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${ncs}.automaticHigherLevelQueries`, title: 'Automatic Higher Level Queries', menuCmd: menu,
	        spec: spec.automaticHigherLevelQueries(),
	      }) +
	      this.makeQuerySetting({
	        path: `${ncs}.tab`, title: 'Default tab', menuCmd: menu, spec: spec.tab(),
	      }) +
	      this.makeOptionRow({
	        title: 'Default Token Actions', path: 'taMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeOptionRow({
	        title: 'Display Settings', path: 'displayMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeOptionRow({
	        title: 'Houserule Settings', path: 'hrMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeOptionRow({
	        title: 'Hide Settings', path: 'hideMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeOptionRow({
	        title: 'Measurement Systems', path: 'msMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeOptionRow({
	        title: 'Text sizes', path: 'textMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      });

	    const th = utils.buildHTML('th', 'New Character Sheets', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToMainMenuButton();
	  }
	}

	class InitiativeMenu extends ConfigMenu {
	  getMenu() {
	    const ncs = 'newCharSettings';
	    const menu = 'initMenu';
	    const spec = this.specRoot.newCharSettings;

	    const optionRows =
	      this.makeQuerySetting({
	        path: `${ncs}.initiativeOutput`, title: 'Initiative Output', menuCmd: menu, spec: spec.initiativeOutput(),
	      }) +
	      this.makeQuerySetting({
	        path: `${ncs}.initiativeRoll`, title: 'Init Roll', menuCmd: menu, spec: spec.initiativeRoll(),
	      }) +
	      this.makeToggleSetting({
	        path: `${ncs}.initiativeToTracker`, title: 'Init To Tracker', menuCmd: menu, spec: spec.initiativeToTracker(),
	      }) +
	      this.makeToggleSetting({
	        path: `${ncs}.breakInitiativeTies`, title: 'Break Init Ties', menuCmd: menu,
	      });


	    const th = utils.buildHTML('th', 'Initiative Settings', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToNewCharOptions();
	  }
	}


	class DisplayMenu extends ConfigMenu {
	  getMenu() {
	    const display = 'newCharSettings.display';
	    const menu = 'displayMenu';
	    const spec = this.specRoot.newCharSettings.display;

	    const optionRows =
	      this.makeToggleSetting({
	        path: `${display}.showRests`, title: 'Show Rests', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${display}.showPassiveSkills`, title: 'Show Passive Skills', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${display}.showWeight`, title: 'Show Weight', menuCmd: menu, spec: spec.showWeight(),
	      }) +
	      this.makeToggleSetting({
	        path: `${display}.showEmote`, title: 'Show Emote', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${display}.showFreetext`, title: 'Show Freetext', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${display}.showFreeform`, title: 'Show Freeform', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${display}.showDiceModifiers`, title: 'Show Dice Modifiers', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${display}.showCritRange`, title: 'Show Crit Range', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${display}.extraOnACrit`, title: 'Extra on a Crit', menuCmd: menu,
	      });


	    const th = utils.buildHTML('th', 'Display Settings', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToNewCharOptions();
	  }
	}

	class MeasurementSystemsMenu extends ConfigMenu {
	  getMenu() {
	    const ms = 'newCharSettings.measurementSystems';
	    const menu = 'msMenu';
	    const spec = this.specRoot.newCharSettings.measurementSystems;

	    const optionRows =
	      this.makeQuerySetting({
	        path: `${ms}.distanceSystem`, title: 'Distance System', prompt: 'Distance System', menuCmd: menu,
	        spec: spec.distanceSystem(),
	      }) +
	      this.makeQuerySetting({
	        path: `${ms}.weightSystem`, title: 'Weight System', prompt: 'Weight System', menuCmd: menu,
	        spec: spec.weightSystem(),
	      }) +
	      this.makeInputSetting({
	        path: `${ms}.encumbranceMultiplier`, title: 'Encumbrance Multiplier', prompt: 'Encumbrance Multiplier',
	        menuCmd: menu,
	      });

	    const th = utils.buildHTML('th', 'Measurement Systems', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToNewCharOptions();
	  }
	}

	class NewCharacterHouseruleMenu extends ConfigMenu {
	  getMenu() {
	    const hr = 'newCharSettings.houserules';
	    const menu = 'hrMenu';

	    const optionRows =
	      this.makeToggleSetting({
	        path: `${hr}.inspirationMultiple`, title: 'Multiple Inspiration', menuCmd: menu,
	      }) +
	      this.makeQuerySetting({
	        path: `${hr}.criticalDamageHouserule`, title: 'Critical Damage', prompt: 'Critical Damage', menuCmd: menu,
	        spec: this.specRoot.newCharSettings.houserules.criticalDamageHouserule(),
	      }) +
	      this.makeToggleSetting({
	        path: `${hr}.proficiencyDice`, title: 'Proficiency Dice', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${hr}.psionics`, title: 'Psionics', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${hr}.customClasses`, title: 'Custom Classes', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${hr}.expertiseAsAdvantage`, title: 'Expertise as advantage', menuCmd: menu,
	      }) +
	      this.makeQuerySetting({
	        path: `${hr}.baseDC`, title: 'Base DC', prompt: 'Base DC', menuCmd: menu,
	        spec: this.specRoot.newCharSettings.houserules.baseDC(),
	      }) +
	      this.makeQuerySetting({
	        path: `${hr}.mediumArmorMaxDex`, title: 'Medium Armor Max Dex', menuCmd: menu,
	        spec: this.specRoot.newCharSettings.houserules.mediumArmorMaxDex(),
	      }) +
	      this.makeToggleSetting({
	        path: `${hr}.honorToggle`, title: 'Honor', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${hr}.sanityToggle`, title: 'Sanity', menuCmd: menu,
	      }) +
	      this.makeOptionRow({
	        title: 'Saving Throws', path: 'savesMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      });

	    const th = utils.buildHTML('th', 'Houserule Settings', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToNewCharOptions();
	  }
	}

	class HideMenu extends ConfigMenu {
	  getMenu() {
	    const hide = 'newCharSettings.hide';
	    const menu = 'hideMenu';

	    const optionRows = [
	      'hideAbilityChecks', 'hideSavingThrows', 'hideAttack', 'hideDamage', 'hideFreetext', 'hideRecharge', 'hideCost',
	      'hideSavingThrowDC', 'hideSavingThrowFailure', 'hideSavingThrowSuccess', 'hideSpellContent',
	    ].reduce((result, functionName) => {
	      const title = utils.toTitleCase(
	        functionName.replace(/([a-z])([A-Z]+)/g, (match, lower, upper) => `${lower} ${upper.toLowerCase()}`));
	      result += this.makeToggleSetting({
	        path: `${hide}.${functionName}`, title, menuCmd: menu,
	        spec: this.specRoot.newCharSettings.hide[functionName](),
	      });
	      return result;
	    }, '');

	    const th = utils.buildHTML('th', 'Hide Settings', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToNewCharOptions();
	  }
	}

	class SavesMenu extends ConfigMenu {
	  getMenu() {
	    const saves = 'newCharSettings.houserules.saves';
	    const menu = 'savesMenu';

	    const optionRows =
	      this.makeToggleSetting({
	        path: `${saves}.savingThrowsHalfProf`, title: 'Half Proficiency Saves', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${saves}.useCustomSaves`, title: 'Use Custom Saves', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${saves}.useAverageOfAbilities`, title: 'Use Average of Highest Abils', menuCmd: menu,
	      }) +
	      this.makeOptionRow({
	        title: 'Fortitude', path: 'fortitudeMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeOptionRow({
	        title: 'Reflex', path: 'reflexMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      }) +
	      this.makeOptionRow({
	        title: 'Will', path: 'willMenu', command: '', linkText: 'view --&gt;', buttonColor: '#02baf2',
	      });

	    const th = utils.buildHTML('th', 'Houserule Settings', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToHouseRuleOptions();
	  }
	}

	class CustomSaveTypeMenu extends ConfigMenu {

	  constructor(config, specRoot, saveName) {
	    super(config, specRoot);
	    this.saveName = saveName;
	  }

	  getMenu() {
	    const saves = `newCharSettings.houserules.saves.${this.saveName}`;
	    const menu = `${this.saveName}Menu`;

	    const optionRows = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma']
	      .reduce((result, attr) => {
	        const propName = `${this.saveName}${attr}`;
	        result += this.makeToggleSetting({
	          path: `${saves}.${propName}`, title: attr, menuCmd: menu,
	        });
	        return result;
	      }, '');

	    const th = utils.buildHTML('th', `${this.saveName} Saves`, { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToSavesOptions();
	  }
	}


	class NewCharacterTextSizeMenu extends ConfigMenu {
	  getMenu() {
	    const textSizes = 'newCharSettings.textSizes';
	    const menu = 'textMenu';

	    const optionRows =
	      this.makeQuerySetting({
	        path: `${textSizes}.spellsTextSize`, title: 'Spells', menuCmd: menu,
	        spec: this.specRoot.newCharSettings.textSizes.spellsTextSize(),
	      }) +
	      this.makeQuerySetting({
	        path: `${textSizes}.abilityChecksTextSize`, title: 'Ability Checks', menuCmd: menu,
	        spec: this.specRoot.newCharSettings.textSizes.abilityChecksTextSize(),
	      }) +
	      this.makeQuerySetting({
	        path: `${textSizes}.savingThrowsTextSize`, title: 'Saving Throws', menuCmd: menu,
	        spec: this.specRoot.newCharSettings.textSizes.savingThrowsTextSize(),
	      });

	    const th = utils.buildHTML('th', 'Text sizes', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToNewCharOptions();
	  }
	}


	class VariantsMenu extends ConfigMenu {
	  getMenu() {
	    const root = 'variants';
	    const menu = 'varsMenu';

	    const optionRows = this.makeToggleSetting({
	      path: `${root}.rests.longNoHpFullHd`, title: 'Long Rest: No HP, full HD', menuCmd: menu,
	    });

	    const th = utils.buildHTML('th', 'Houserules & Variants', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });

	    return table + this.backToMainMenuButton();
	  }
	}

	class SheetEnhancementsMenu extends ConfigMenu {
	  getMenu() {
	    const root = 'sheetEnhancements';
	    const menu = 'seMenu';

	    const optionRows =
	      this.makeToggleSetting({
	        path: `${root}.rollHPOnDrop`, title: 'Roll HP On Drop', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${root}.autoHD`, title: 'Process HD Automatically', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${root}.autoSpellSlots`, title: 'Process Spell Slots Automatically', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${root}.autoTraits`, title: 'Process Uses automatically', menuCmd: menu,
	      });

	    const th = utils.buildHTML('th', 'Character Sheet Enhancements', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });
	    return table + this.backToMainMenuButton();
	  }
	}

	class TokenActionsMenu extends ConfigMenu {
	  getMenu() {
	    const root = 'newCharSettings.tokenActions';
	    const menu = 'taMenu';
	    const spec = this.specRoot.newCharSettings.tokenActions;

	    const optionRows =
	      this.makeToggleSetting({
	        path: `${root}.showRecharges`, title: 'Show recharges', menuCmd: menu,
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.advantageTracker`, title: 'Advantage Tracker', menuCmd: menu, spec: spec.advantageTracker(),
	      }) +
	      this.makeToggleSetting({
	        path: `${root}.initiative`, title: 'Initiative', menuCmd: menu,
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.abilityChecks`, title: 'Ability Checks', menuCmd: menu, spec: spec.abilityChecks(),
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.savingThrows`, title: 'Saves', menuCmd: menu, spec: spec.savingThrows(),
	      }) +
	      this.makeToggleSetting({
	        path: `${root}.rests`, title: 'Rests', menuCmd: menu,
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.attacks`, title: 'Attacks', menuCmd: menu, spec: spec.attacks(),
	      }) +
	      this.makeToggleSetting({
	        path: `${root}.spells`, title: 'Spells', menuCmd: menu,
	      }) +
	      this.makeToggleSetting({
	        path: `${root}.statblock`, title: 'Statblock', menuCmd: menu,
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.traits`, title: 'Traits', menuCmd: menu, spec: spec.traits(),
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.racialFeatures`, title: 'Racial Features', menuCmd: menu, spec: spec.racialFeatures(),
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.classFeatures`, title: 'Class Features', menuCmd: menu, spec: spec.classFeatures(),
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.feats`, title: 'Feats', menuCmd: menu, spec: spec.feats(),
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.actions`, title: 'Actions', menuCmd: menu, spec: spec.actions(),
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.reactions`, title: 'Reactions', menuCmd: menu, spec: spec.reactions(),
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.legendaryActions`, title: 'Legendary Actions', menuCmd: menu, spec: spec.legendaryActions(),
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.lairActions`, title: 'Lair Actions', menuCmd: menu, spec: spec.lairActions(),
	      }) +
	      this.makeQuerySetting({
	        path: `${root}.regionalEffects`, title: 'Regional Effects', menuCmd: menu, spec: spec.regionalEffects(),
	      });

	    const th = utils.buildHTML('th', 'Default Token Actions', { colspan: '2' });
	    const tr = utils.buildHTML('tr', th, { style: 'margin-top: 5px;' });
	    const table = utils.buildHTML('table', tr + optionRows, { style: 'width: 100%; font-size: 0.9em;' });
	    return table + this.backToNewCharOptions();
	  }
	}

	/* eslint-disable object-property-newline */


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);
	const utils = __webpack_require__(7);
	const ShapedModule = __webpack_require__(14);
	const ShapedConfig = __webpack_require__(17);

	const rollOptions = {
	  normal: {
	    message: 'normally',
	    shaped_d20: 'd20',
	  },
	  advantage: {
	    message: 'with advantage',
	    shaped_d20: '2d20kh1',
	  },
	  disadvantage: {
	    message: 'with disadvantage',
	    shaped_d20: '2d20kl1',
	  },
	  roll2: {
	    message: 'two dice',
	    shaped_d20: '1d20',
	  },
	};

	class AdvantageTracker extends ShapedModule {

	  addCommands(commandProcessor) {
	    return commandProcessor.addCommand('at', this.process.bind(this), false)
	      .option('advantage', ShapedConfig.booleanValidator)
	      .option('disadvantage', ShapedConfig.booleanValidator)
	      .option('normal', ShapedConfig.booleanValidator)
	      .option('revert', ShapedConfig.booleanValidator)
	      .option('persist', ShapedConfig.booleanValidator)
	      .option('id', ShapedConfig.getCharacterValidator(this.roll20), false)
	      .withSelection({
	        character: {
	          min: 0,
	          max: Infinity,
	        },
	      });
	  }

	  process(options) {
	    let type;

	    // const at = new AdvantageTracker(this.logger, this.myState, this.roll20);

	    if (!_.isUndefined(options.id)) {
	      // if an ID is passed, overwrite any selection, and only process for the passed charId
	      options.selected.character = [options.id];
	    }

	    if (_.isEmpty(options.selected.character)) {
	      this.reportError('Advantage Tracker was called, but no token was selected, and no character id was passed.');
	    }
	    else {
	      if (options.normal) {
	        type = 'normal';
	      }
	      else if (options.advantage) {
	        type = 'advantage';
	      }
	      else if (options.disadvantage) {
	        type = 'disadvantage';
	      }

	      if (!_.isUndefined(type)) {
	        this.setRollOption(type, options.selected.character);
	      }

	      if (options.revert) {
	        this.setAutoRevert(true, options.selected.character);
	      }
	      else if (options.persist) {
	        this.setAutoRevert(false, options.selected.character);
	      }
	    }
	  }

	  handleRollOptionChange(msg) {
	    const char = [];
	    char.push(msg.get('_characterid'));
	    const br = this.buildResources(_.uniq(_.union(char)));

	    if (!_.isEmpty(br)) {
	      this.setStatusMarkers(br[0].tokens,
	        msg.get('current') === rollOptions.advantage.shaped_d20,
	        msg.get('current') === rollOptions.disadvantage.shaped_d20);

	      switch (msg.get('current')) {
	        case rollOptions.normal.shaped_d20:
	          this.sendChatNotification(br[0], 'normal');
	          break;
	        case rollOptions.advantage.shaped_d20:
	          this.sendChatNotification(br[0], 'advantage');
	          break;
	        case rollOptions.disadvantage.shaped_d20:
	          this.sendChatNotification(br[0], 'disadvantage');
	          break;
	        default:
	          break;
	      }
	    }
	  }

	  handleTokenChange(token) {
	    this.logger.debug('AT: Updating New Token');
	    if (this.shouldShowMarkers() && token.get('represents') !== '') {
	      const character = this.roll20.getObj('character', token.get('represents'));
	      const setting = this.roll20.getAttrByName(character.id, 'shaped_d20');

	      if (this.shouldIgnoreNpcs()) {
	        if (this.roll20.getAttrByName(character.id, 'is_npc') === '1') {
	          return;
	        }
	      }

	      token.set(`status_${this.disadvantageMarker()}`, setting === rollOptions.disadvantage.shaped_d20);
	      token.set(`status_${this.advantageMarker()}`, setting === rollOptions.advantage.shaped_d20);
	    }
	  }

	  buildResources(characterIds) {
	    let res = _.chain(characterIds)
	      .map(charId => this.roll20.getObj('character', charId))
	      .reject(_.isUndefined)
	      .map(char => ({
	        character: char,
	        tokens: this.roll20.filterObjs(obj => obj.get('_type') === 'graphic' && char.id === obj.get('represents')),
	      }))
	      .value();

	    if (this.shouldIgnoreNpcs()) {
	      res = _.chain(res)
	        .filter((c) => {
	          const isNpc = this.roll20.getAttrByName(c.character.id, 'is_npc');
	          return isNpc && parseInt(isNpc, 10) === 0;
	        })
	        .value();
	    }

	    return res;
	  }

	  setStatusMarkers(tokens, showAdvantage, showDisadvantage) {
	    if (this.shouldShowMarkers()) {
	      _.each(tokens, (token) => {
	        token.set(`status_${this.advantageMarker()}`, showAdvantage);
	        token.set(`status_${this.disadvantageMarker()}`, showDisadvantage);
	      });
	    }
	  }

	  setAutoRevert(value, selectedChars) {
	    const resources = this.buildResources(_.chain(selectedChars).map(c => c.get('_id')).value());
	    _.each(resources, (resource) => {
	      const charId = resource.character.get('_id');
	      this.roll20.setAttrByName(charId, 'auto_revert_advantage', value ? 1 : 0);
	    });
	  }

	  setRollOption(type, selectedChars) {
	    const resources = this.buildResources(_.chain(selectedChars).map(c => c.get('_id')).value());

	    _.each(resources, (resource) => {
	      const charId = resource.character.get('_id');

	      this.setStatusMarkers(resource.tokens, type === 'advantage', type === 'disadvantage');

	      if (this.roll20.getAttrByName(charId, 'shaped_d20') === rollOptions[type].shaped_d20) {
	        return;
	      }

	      this.roll20.setAttrWithWorker(charId, 'shaped_d20', rollOptions[type].shaped_d20);

	      this.sendChatNotification(resource, type);
	    });
	  }

	  sendChatNotification(resource, type) {
	    if (this.outputOption() !== 'silent') {
	      let msg = ` &{template:5e-shaped} {{character_name=${resource.character.get('name')}}} ` +
	        `@{${resource.character.get('name')}|show_character_name} {{title=${utils.toTitleCase(type)}}} ` +
	        `{{text_top=${resource.character.get('name')} is rolling ${rollOptions[type].message}!}}`;
	      if (this.outputOption() === 'whisper') {
	        msg = `/w gm ${msg}`;
	      }
	      this.roll20.sendChat('Shaped AdvantageTracker', msg);
	    }
	  }

	  outputOption() {
	    return this.myState.config.advTrackerSettings.output;
	  }

	  shouldShowMarkers() {
	    return this.myState.config.advTrackerSettings.showMarkers;
	  }

	  shouldIgnoreNpcs() {
	    return this.myState.config.advTrackerSettings.ignoreNpcs;
	  }

	  advantageMarker() {
	    return this.myState.config.advTrackerSettings.advantageMarker;
	  }

	  disadvantageMarker() {
	    return this.myState.config.advTrackerSettings.disadvantageMarker;
	  }
	}

	module.exports = AdvantageTracker;


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);
	const ShapedModule = __webpack_require__(14);
	const ShapedConfig = __webpack_require__(17);
	const utils = __webpack_require__(7);


	class RestManager extends ShapedModule {

	  addCommands(commandProcessor) {
	    this.rests = [
	      {
	        name: 'dieRollRecharge',
	        operations: [
	          this.restoreUses.bind(this),
	        ],
	        rechargeValue: 'RECHARGE_',
	        displayName: 'Dice Roll Recharge',
	      },
	      {
	        name: 'turn',
	        operations: [
	          this.restoreUses.bind(this),
	          this.rechargeLegendaries.bind(this),
	        ],
	        rechargeValue: 'TURN',
	        displayName: 'Turn Recharge',
	      },
	      {
	        name: 'short',
	        operations: [
	          this.restoreUses.bind(this),
	          this.regainWarlockSpellSlots.bind(this),
	        ],
	        rechargeValue: 'SHORT_OR_LONG_REST',
	        displayName: 'Short Rest',
	      },
	      {
	        name: 'long',
	        operations: [
	          this.restoreUses.bind(this),
	          this.resetHP.bind(this),
	          this.regainHitDie.bind(this),
	          this.regainSpellSlots.bind(this),
	          this.regainSpellPoints.bind(this),
	          this.reduceExhaustion.bind(this),
	        ],
	        rechargeValue: 'LONG_REST',
	        displayName: 'Long Rest',
	      },
	    ];

	    this.displayTemplates = {
	      hp: values => (values.hp > 0 ? `{{heal=[[${values.hp}]]}}` : ''),
	      hd: values => values.hd.map(hd => `{{Hit Die Regained (${hd.die})=${hd.quant}}}`).join(''),
	      uses: values => `{{Uses Recharged=${values.uses.join(', ')}}}`,
	      slots: values => (values.slots ? '{{Spell Slots Regained=&nbsp;}}' : ''),
	      exhaustion: values => `{{text_top=Removed 1 Level Of Exhaustion, now at level: [[${values.exhaustion}]]}}`,
	      warlockSlots: values => (values.warlockSlots ? '{{Warlock Spell Slots Regained=&nbsp;}}' : ''),
	      spellPoints: values => (values.spellPoints ? '{{Spell Points Regained=&nbsp;}}' : ''),
	      legendaries: values => (values.legendaries ? `{{Legendary points regained=${values.legendaries}}}` : ''),
	    };

	    return commandProcessor.addCommand('rest', this.handleRest.bind(this), false)
	      .option('type', (value) => {
	        const converted = value.toLowerCase();
	        return {
	          valid: _.chain(this.rests).pluck('name').contains(converted).value(),
	          converted,
	        };
	      }, true)
	      .option('character', ShapedConfig.getCharacterValidator(this.roll20), false)
	      .withSelection({
	        character: {
	          min: 0,
	          max: Infinity,
	        },
	      });
	  }

	  handleRest(options) {
	    let chars = options.selected.character;
	    if (!_.isUndefined(options.character)) {
	      chars = [options.character];
	    }
	    chars.forEach((char) => {
	      const results = this.doRest(char, options.type);
	      this.roll20.sendChat(`character|${char.id}`, this.buildMessage(char, options.type, results), null,
	        { noarchive: true });
	    });
	  }

	  doRest(char, type) {
	    const restIndex = this.rests.findIndex(rest => rest.name === type);
	    const restsToProcess = this.rests.slice(0, restIndex + 1);
	    return restsToProcess.reduce((results, rest) =>
	        rest.operations
	          .map(op => op(char, rest.name))
	          .reduce((restResults, opResult) =>
	            utils.extendWithArrayValues(restResults, opResult), results),
	      {});
	  }


	  buildMessage(character, restType, results) {
	    const charName = character.get('name');
	    const charId = character.id;
	    const displayName = _.findWhere(this.rests, { name: restType }).displayName;

	    let msg = `&{template:5e-shaped} {{title=${displayName}}} {{character_name=${charName}}}`;

	    if (this.roll20.getAttrByName(charId, 'show_character_name') === '@{show_character_name_yes}') {
	      msg += '{{show_character_name=1}}';
	    }

	    msg += _.chain(this.displayTemplates)
	      .pick(_.keys(results))
	      .map(template => template(results))
	      .value()
	      .join('');

	    return msg;
	  }

	  restoreUses(character, restType) {
	    const charId = character.id;
	    const rechargeValue = _.findWhere(this.rests, { name: restType }).rechargeValue;
	    this.logger.debug('Searching for recharge value $$$', rechargeValue);

	    const traitNames = _.chain(this.roll20.findObjs({ type: 'attribute', characterid: charId }))
	      .map((attribute) => {
	        const match = attribute.get('name').match(/^(repeating_[^_]+_[^_]+)_recharge$/);
	        const attVal = attribute.get('current');
	        if (match && attVal.indexOf(rechargeValue) === 0) {
	          this.logger.debug('Matching against rechargeValue $$$', attribute);
	          return match[1];
	        }
	        return undefined;
	      })
	      .reject(_.isUndefined)
	      .reject(traitPre => traitPre.match(/repeating_(armor|equipment|lairaction|regionaleffect)/))
	      .uniq()
	      .map((traitPre) => {
	        const attName = this.roll20.getAttrByName(charId, `${traitPre}_name`);
	        this.logger.debug(`Recharging '${attName}'`);
	        const usesAttr = this.roll20.getAttrObjectByName(charId, `${traitPre}_uses`);
	        if (!usesAttr || !usesAttr.get('max')) {
	          this.logger.error(`Tried to recharge the uses for '${attName}' for character with id ${charId}, ` +
	            'but there were no uses defined.');
	          return undefined;
	        }

	        if (usesAttr.get('current') < usesAttr.get('max')) {
	          usesAttr.setWithWorker({ current: usesAttr.get('max') });
	          return attName;
	        }
	        return undefined;
	      })
	      .compact()
	      .value();

	    return {
	      uses: traitNames,
	    };
	  }

	  rechargeLegendaries(character) {
	    const legendaryAmountAttr = this.roll20.getAttrObjectByName(character.id, 'legendary_action_amount');
	    if (legendaryAmountAttr) {
	      const max = legendaryAmountAttr.get('max');
	      if (max) {
	        this.logger.debug('Restoring legendary points');
	        const current = legendaryAmountAttr.get('current') || 0;
	        legendaryAmountAttr.setWithWorker({ current: max });
	        return {
	          legendaries: max - current,
	        };
	      }
	    }
	    return null;
	  }

	  resetHP(character) {
	    if (this.myState.config.variants.rests.longNoHpFullHd) {
	      return null;
	    }

	    const charId = character.id;
	    this.logger.debug('Resetting HP to max');
	    const max = parseInt(this.roll20.getAttrByName(charId, 'HP', 'max'), 10);
	    if (_.isNaN(max)) {
	      this.reportError(`Can't recharge HP for character ${character.get('name')} because max HP is not set`);
	      return null;
	    }
	    const current = parseInt(this.roll20.getAttrByName(charId, 'HP', 'current') || 0, 10);

	    this.roll20.setAttrWithWorker(charId, 'HP', max);

	    return {
	      hp: max - current,
	    };
	  }

	  regainHitDie(character) {
	    const charId = character.id;
	    this.logger.debug('Regaining Hit Die');
	    const hitDieRegained = _.chain(this.roll20.findObjs({ type: 'attribute', characterid: charId }))
	      .filter(attribute => (attribute.get('name').match(/^hd_d\d{1,2}$/)))
	      .uniq()
	      .map((hdAttr) => {
	        const max = parseInt(hdAttr.get('max'), 10);
	        if (max > 0) {
	          const current = parseInt(hdAttr.get('current') || 0, 10);

	          let regained = Math.min(max - current, Math.max(1, Math.floor(max / 2)));
	          if (this.myState.config.variants.rests.longNoHpFullHd) {
	            regained = max - current;
	          }

	          if (regained) {
	            this.roll20.setAttrWithWorker(charId, hdAttr.get('name'), current + regained);
	            return {
	              die: hdAttr.get('name').replace(/hd_/, ''),
	              quant: regained,
	            };
	          }
	        }
	        return null;
	      })
	      .compact()
	      .value();

	    return {
	      hd: hitDieRegained,
	    };
	  }

	  regainSpellSlots(character) {
	    const charId = character.id;
	    let slotsFound = false;

	    this.logger.debug('Regaining Spell Slots');
	    _.chain(this.roll20.findObjs({ type: 'attribute', characterid: charId }))
	      .filter(attribute => (attribute.get('name').match(/^spell_slots_l\d$/)))
	      .uniq()
	      .each((slotAttr) => {
	        const max = parseInt(slotAttr.get('max'), 10);
	        if (max > 0) {
	          this.roll20.setAttrWithWorker(charId, slotAttr.get('name'), max);
	          slotsFound = true;
	        }
	      });

	    return {
	      slots: slotsFound,
	    };
	  }

	  regainSpellPoints(character) {
	    const charId = character.id;
	    this.logger.debug('Regaining Spell Points');
	    let spellPointsFound = false;
	    const spellPointsAttr = this.roll20.getAttrObjectByName(charId, 'spell_points');
	    const spellPointsMax = spellPointsAttr ? parseInt(spellPointsAttr.get('max'), 10) : 0;
	    if (spellPointsMax) {
	      spellPointsAttr.setWithWorker('current', spellPointsMax);
	      spellPointsFound = true;
	    }

	    return {
	      spellPoints: spellPointsFound,
	    };
	  }

	  regainWarlockSpellSlots(character) {
	    const charId = character.id;
	    this.logger.debug('Regaining Warlock Spell slots');
	    let warlockSlotsFound = false;
	    const warlockSlotsAttr = this.roll20.getAttrObjectByName(charId, 'warlock_spell_slots');
	    const slotsMax = warlockSlotsAttr ? parseInt(warlockSlotsAttr.get('max'), 10) : 0;
	    if (slotsMax) {
	      warlockSlotsAttr.setWithWorker('current', slotsMax);
	      warlockSlotsFound = true;
	    }
	    return {
	      warlockSlots: warlockSlotsFound,
	    };
	  }

	  reduceExhaustion(character) {
	    const charId = character.id;
	    this.logger.debug('Reducing Exhaustion');

	    const currentLevel = parseInt(this.roll20.getAttrByName(charId, 'exhaustion_level'), 10);

	    if (currentLevel > 0) {
	      this.roll20.setAttrWithWorker(charId, 'exhaustion_level', currentLevel - 1);
	      return {
	        exhaustion: currentLevel - 1,
	      };
	    }

	    return null;
	  }

	}

	module.exports = RestManager;


/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const ShapedModule = __webpack_require__(14);
	const _ = __webpack_require__(2);

	class UsesManager extends ShapedModule {

	  addCommands(commandProcessor) {
	    // no commands for this module
	    return commandProcessor;
	  }

	  /**
	   * Handles the click event of a trait when 'autoTraits' is true
	   * Consumes one use of the clicked trait
	   * @param {object} options - The message options
	   */
	  handleUses(options) {
	    if (!this.myState.config.sheetEnhancements.autoTraits) {
	      return;
	    }

	    let perUse = parseInt(options.perUse || 1, 10);
	    if (_.isNaN(perUse)) {
	      this.reportError(`Character ${options.characterName} has an invalid 'Per Use" value [${options.perUse}] for ` +
	        `${options.title} so uses could not be decremented.`);
	      return;
	    }

	    perUse = perUse || 1;

	    const usesAttr = this.roll20.getAttrObjectByName(options.character.id, `${options.repeatingItem}_uses`);


	    if (usesAttr && usesAttr.get('max')) {
	      const currentVal = parseInt(usesAttr.get('current'), 10);
	      if (currentVal - perUse >= 0) {
	        usesAttr.setWithWorker({ current: currentVal - perUse });
	      }
	      else {
	        this.reportPublic('Uses Police', `${options.characterName} can't use ${options.title} because ` +
	          'they don\'t have sufficient uses left.');
	      }
	    }
	  }

	  handleLegendary(options) {
	    if (!this.myState.config.sheetEnhancements.autoTraits) {
	      return;
	    }


	    let cost = 1;
	    switch (options.cost) {
	      case 'COSTS_2_ACTIONS':
	        cost = 2;
	        break;
	      case 'COSTS_3_ACTIONS':
	        cost = 3;
	        break;
	      default:
	      // Do nothing
	    }

	    const legendaryAmountAttr = this.roll20.getAttrObjectByName(options.character.id, 'legendary_action_amount');
	    if (!legendaryAmountAttr) {
	      this.logger.error('No legendary action amount defined for character $$$ so can\'t decrement it',
	        options.character.id);
	      return;
	    }

	    const current = legendaryAmountAttr.get('current');
	    if (cost > current) {
	      this.reportPublic('Uses Police', `${options.characterName} can't use ${options.title} because ` +
	        'they don\'t have sufficient legendary points left.');
	      return;
	    }

	    legendaryAmountAttr.setWithWorker({ current: current - 1 });
	  }
	}

	module.exports = UsesManager;


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);
	const ShapedModule = __webpack_require__(14);

	class AmmoManager extends ShapedModule {

	  addCommands(commandProcessor) {
	    return commandProcessor;
	  }

	  consumeAmmo(options, msg) {
	    if (!this.roll20.checkCharacterFlag(options.character.id, 'ammo_auto_use')) {
	      return;
	    }

	    const ammoAttr = _.chain(this.roll20.findObjs({ type: 'attribute', characterid: options.character.id }))
	      .filter(attribute => attribute.get('name').indexOf('repeating_ammo') === 0)
	      .groupBy(attribute => attribute.get('name').replace(/(repeating_ammo_[^_]+).*/, '$1'))
	      .find(attributeList =>
	        _.find(attributeList, attribute =>
	          attribute.get('name').match(/.*name$/) && attribute.get('current') === options.ammoName)
	      )
	      .find(attribute => attribute.get('name').match(/.*qty$/))
	      .value();

	    if (!ammoAttr) {
	      this.logger.error('No ammo attribute found corresponding to name $$$', options.ammoName);
	      return;
	    }

	    let ammoUsed = 1;
	    if (options.ammo) {
	      const rollRef = options.ammo.match(/\$\[\[(\d+)\]\]/);
	      if (rollRef) {
	        const rollExpr = msg.inlinerolls[rollRef[1]].expression;
	        const match = rollExpr.match(/\d+-(\d+)/);
	        if (match) {
	          ammoUsed = match[1];
	        }
	      }
	    }

	    const val = parseInt(ammoAttr.get('current'), 10) || 0;
	    ammoAttr.setWithWorker('current', Math.max(0, val - ammoUsed));
	  }
	}

	module.exports = AmmoManager;


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	/* globals unescape */
	'use strict';
	const ShapedModule = __webpack_require__(14);
	const ShapedConfig = __webpack_require__(17);
	const _ = __webpack_require__(2);
	const sanitise = __webpack_require__(24);
	const utils = __webpack_require__(7);
	const Logger = __webpack_require__(5);

	class Importer extends ShapedModule {
	  constructor(entityLookup, parser, abilityMaker, srdConverter) {
	    super();
	    this.entityLookup = entityLookup;
	    this.parser = parser;
	    this.abilityMaker = abilityMaker;
	    this.srdConverter = srdConverter;
	  }

	  addCommands(commandProcessor) {
	    this.logger.wrapModule(this.srdConverter);
	    // !shaped-import-statblock
	    return commandProcessor.addCommand('import-statblock', this.importStatblock.bind(this), true)
	      .option('overwrite', ShapedConfig.booleanValidator)
	      .option('replace', ShapedConfig.booleanValidator)
	      .withSelection({
	        graphic: {
	          min: 1,
	          max: Infinity,
	        },
	      })
	      // !shaped-import-monster , !shaped-monster
	      .addCommand(['import-monster', 'monster'], this.importMonstersFromJson.bind(this), true)
	      .option('all', ShapedConfig.booleanValidator)
	      .optionLookup('monsters', _.partial(this.entityLookup.findEntity.bind(this.entityLookup), 'monsters', _, false))
	      .option('overwrite', ShapedConfig.booleanValidator)
	      .option('replace', ShapedConfig.booleanValidator)
	      .option('as', ShapedConfig.stringValidator)
	      .withSelection({
	        graphic: {
	          min: 0,
	          max: 1,
	        },
	      })
	      .addCommand('import-by-token', this.importByToken.bind(this), true)
	      .option('overwrite', ShapedConfig.booleanValidator)
	      .option('replace', ShapedConfig.booleanValidator)
	      .withSelection({
	        graphic: {
	          min: 1,
	          max: Infinity,
	        },
	      })
	      // !shaped-import-spell, !shaped-spell
	      .addCommand(['import-spell', 'spell'], this.importSpellsFromJson.bind(this), false)
	      .optionLookup('spells', _.partial(this.entityLookup.findEntity.bind(this.entityLookup), 'spells', _, false))
	      .withSelection({
	        character: {
	          min: 1,
	          max: 1,
	        },
	      })
	      // !shaped-import-spell-list
	      .addCommand('import-spell-list', this.importSpellListFromJson.bind(this), false)
	      .options(ShapedConfig.spellSearchOptions)
	      .withSelection({
	        character: {
	          min: 1,
	          max: 1,
	        },
	      })
	      // !shaped-token-defaults
	      .addCommand(['token-defaults', 'apply-defaults'], this.applyTokenDefaults.bind(this), false)
	      .withSelection({
	        graphic: {
	          min: 1,
	          max: Infinity,
	        },
	      })
	      .addCommand('update-character', this.updateCharacter.bind(this), true)
	      .withSelection({
	        character: {
	          min: 0,
	          max: Infinity,
	          anyVersion: true,
	        },
	      })
	      .option('all', ShapedConfig.booleanValidator)
	      .addCommand('expand-spells', this.expandSpells.bind(this), false)
	      .withSelection({
	        character: {
	          min: 1,
	          max: Infinity,
	        },
	      });
	  }

	  applyTokenDefaults(options) {
	    const messageBody = _.chain(options.selected.graphic)
	      .map((token) => {
	        const represents = token.get('represents');
	        const character = this.roll20.getObj('character', represents);
	        if (character) {
	          this.applyCharacterDefaults(character);
	          this.createTokenActions(character);
	          this.getTokenConfigurer(token)(character);
	          const isNpc = this.roll20.getAttrByName(character.id, 'is_npc');
	          let sensesString;
	          if (isNpc === 1) {
	            sensesString = this.roll20.getAttrByName(character.id, 'senses');
	          }
	          else {
	            sensesString = ['blindsight', 'darkvision', 'tremorsense', 'truesight']
	              .map(sense => [sense, this.roll20.getAttrByName(character.id, sense)])
	              .filter(senseInfo => senseInfo[1])
	              .map(senseInfo => `${senseInfo[0]} ${senseInfo[1]}`)
	              .join(',');
	          }
	          this.getTokenVisionConfigurer(token, sensesString)(character);
	          this.getDefaultTokenPersister(token)(character);
	          return character.get('name');
	        }
	        return null;
	      })
	      .compact()
	      .value()
	      .join('</li><li>');

	    this.reportPlayer('Apply Defaults', `Character and token defaults applied for:<ul><li>${messageBody}</li></ul>`);
	  }

	  importStatblock(options) {
	    this.logger.info('Importing statblocks for tokens $$$', options.selected.graphic);
	    _.each(options.selected.graphic, (token) => {
	      const error = `Could not find GM notes on either selected token ${token.get('name')} or the character ` +
	        'it represents. Have you pasted it in correctly?';
	      const text = token.get('gmnotes');
	      if (!text) {
	        const char = this.roll20.getObj('character', token.get('represents'));
	        if (char) {
	          char.get('gmnotes', (notes) => {
	            if (notes) {
	              return this.processGMNotes(options, token, notes);
	            }
	            return this.reportError(error);
	          });
	        }
	        else {
	          return this.reportError(error);
	        }
	      }

	      return this.processGMNotes(options, token, text);
	    });
	  }

	  processGMNotes(options, token, text) {
	    text = sanitise(unescape(text), this.logger);
	    const monsters = this.parser.parse(text).monsters;
	    this.importMonsters(monsters, options, token, [
	      function gmNotesSetter(character) {
	        character.set('gmnotes', text.replace(/\n/g, '<br>'));
	      },
	    ]);
	  }

	  importMonstersFromJson(options) {
	    if (options.all) {
	      options.monsters = this.entityLookup.getAll('monsters');
	      delete options.all;
	    }

	    if (_.isEmpty(options.monsters)) {
	      this.showEntityPicker('monster', 'monsters');
	      return null;
	    }
	    return this.importMonsters(options.monsters, options, options.selected.graphic, [])
	      .then((results) => {
	        if (!_.isEmpty(results.importedList)) {
	          const monsterList = results.importedList.map(char => char.get('name')).join('</li><li>');
	          this.reportPlayer('Import Success', `Added the following monsters: <ul><li>${monsterList}</li></ul>`);
	        }
	        if (!_.isEmpty(results.errors)) {
	          const errorList = results.errors.join('</li><li>');
	          this.reportError(`The following errors occurred on import:  <ul><li>${errorList}</li></ul>`);
	        }
	      });
	  }

	  importByToken(options) {
	    const notFound = [];
	    const imported = [];
	    const errors = [];
	    return options.selected.graphic
	      .reduce((promise, token) =>
	        promise.then((prevImported) => {
	          if (prevImported) {
	            imported.push.apply(imported, prevImported.importedList);
	            errors.push.apply(errors, prevImported.errors);
	          }
	          const monsterName = token.get('name');
	          const monster = this.entityLookup.findEntity('monsters', monsterName, true);
	          if (monster) {
	            return this.importMonsters([monster], options, token, []);
	          }
	          notFound.push(monsterName);
	          return null;
	        }), Promise.resolve())
	      .then((prevImported) => {
	        if (prevImported) {
	          imported.push.apply(imported, prevImported.importedList);
	          errors.push.apply(errors, prevImported.errors);
	        }
	        this.logger.debug('Final results: $$$', imported);
	        let message = '';
	        if (!_.isEmpty(imported)) {
	          message += 'The following monsters were imported successfully:<ul><li>' +
	            `${imported.map(monster => monster.get('name')).join('</li><li>')}</ul>`;
	        }
	        if (!_.isEmpty(notFound)) {
	          message += 'The following monsters were not found in the database:<ul><li>' +
	            `${notFound.join('</li><li>')}</li></ul>`;
	        }
	        if (!_.isEmpty(errors)) {
	          message += 'The following errors were reported: <ul><li>  ' +
	            `${errors.join('</li><li>')}</li></ul>`;
	        }
	        this.reportPlayer('Monster Import Complete', message);
	      });
	  }

	  importMonsters(monsters, options, token, characterProcessors) {
	    const characterRetrievalStrategies = [];

	    if (_.size(monsters) === 1 && options.as) {
	      monsters[0].name = options.as;
	    }

	    if (token) {
	      characterProcessors.push(this.getAvatarCopier(token).bind(this));
	      if (_.size(monsters) === 1) {
	        characterProcessors.push(this.getTokenConfigurer(token, true).bind(this));
	        characterProcessors.push(this.getTokenVisionConfigurer(token, monsters[0].senses));
	        characterProcessors.push(this.getDefaultTokenPersister(token));
	        if (options.replace || options.overwrite) {
	          characterRetrievalStrategies.push(this.getTokenRetrievalStrategy(token).bind(this));
	        }
	      }
	    }
	    if (options.replace) {
	      characterRetrievalStrategies.push(this.nameRetrievalStrategy.bind(this));
	    }

	    characterRetrievalStrategies.push(this.creationRetrievalStrategy.bind(this));
	    characterProcessors.push(this.applyCharacterDefaults.bind(this));
	    characterProcessors.push(this.monsterDataPopulator.bind(this));
	    characterProcessors.push(this.createTokenActions.bind(this));

	    const errors = [];
	    const importedList = [];
	    return monsters
	      .reduce((prevPromise, monsterData) =>
	        prevPromise.then(() => {
	          const character = _.reduce(characterRetrievalStrategies,
	            (result, strategy) => result || strategy(monsterData.name, errors), null);

	          if (!character) {
	            this.logger.error('Failed to find or create character for monster $$$', monsterData.name);
	            return null;
	          }

	          const oldAttrs = this.roll20.findObjs({ type: 'attribute', characterid: character.id });
	          _.invoke(oldAttrs, 'remove');
	          character.set('name', monsterData.name);

	          return characterProcessors.reduce((charPromise, proc) =>
	              charPromise.then(updatedChar => proc(updatedChar, monsterData))
	            , Promise.resolve(character))
	            .then((finishedChar) => {
	              importedList.push(finishedChar);
	            });
	        }), Promise.resolve())
	      .then(() => {
	        this.logger.debug('All monsters imported $$$', importedList);
	        return {
	          errors,
	          importedList,
	        };
	      });
	  }

	  importSpellsFromJson(options) {
	    if (_.isEmpty(options.spells)) {
	      this.showEntityPicker('spell', 'spells');
	      return null;
	    }

	    return this.importData(options.selected.character, _.pick(options, 'spells'))
	      .then(() => {
	        this.reportPlayer('Import Success', 'Added the following spells:  <ul><li>' +
	          `${_.map(options.spells, spell => spell.name).join('</li><li>')}</li></ul>`);
	      });
	  }

	  importSpellListFromJson(options) {
	    const spells = this.entityLookup.searchEntities('spells', _.pick(options, _.keys(ShapedConfig.spellSearchOptions)));
	    const newOpts = _.omit(options, _.keys(ShapedConfig.spellSearchOptions));
	    newOpts.spells = spells;
	    return this.importSpellsFromJson(newOpts);
	  }

	  fixRoll20Brokenness(character) {
	    _.chain(this.roll20.findObjs({ characterid: character.id, type: 'attribute' }))
	      .groupBy(attr => attr.get('name'))
	      .pick(attrGroup => attrGroup.length > 1)
	      .each((attrGroup) => {
	        this.logger.debug('Found duplicate attributes from character $$$: $$$', character.get('name'),
	          attrGroup.map(attr => [attr.get('name'), attr.get('current'), attr.get('max'), attr.id]));
	        attrGroup.reduce((previous, attr) => {
	          if (attr.get('current')) {
	            previous.setWithWorker({ current: attr.get('current') });
	          }
	          else if (attr.get('max')) {
	            previous.setWithWorker({ max: attr.get('max') });
	          }
	          attr.remove();
	          return previous;
	        });
	      });
	    return character;
	  }

	  getEntityCriteriaAdaptor(entityType) {
	    return (criterionOption, options) => {
	      const result = this.entityLookup.searchEntities(entityType, criterionOption, options[entityType]);
	      if (result) {
	        // If we get a result, wipe the existing list so that the new one replaces it
	        options[entityType] = [];
	      }
	      return result;
	    };
	  }

	  showEntityPicker(entityName, entityNamePlural) {
	    const list = this.entityLookup.getKeys(entityNamePlural, true);

	    if (!_.isEmpty(list)) {
	      // title case the  names for better display
	      list.forEach((part, index) => (list[index] = utils.toTitleCase(part)));

	      // create a clickable button with a roll query to select an entity from the loaded json
	      this.reportPlayer(`${utils.toTitleCase(entityName)} Importer`,
	        `<a href="!shaped-import-${entityName} --?{Pick a ${entityName}|${list.join('|')}}">Click to select a ` +
	        `${entityName}</a>`);
	    }
	    else {
	      this.reportError(`Could not find any ${entityNamePlural}.<br/>Please ensure you have a properly formatted ` +
	        `${entityNamePlural} json file.`);
	    }
	  }


	  monsterDataPopulator(character, monsterData) {
	    const converted = this.srdConverter.convertMonster(monsterData);
	    this.logger.debug('Converted monster data: $$$', converted);
	    return this.importData(character, converted);
	  }

	  importData(character, data) {
	    this.logger.debug('Importing new character data $$$', data);
	    const pronounInfo = this.getPronounInfo(character);
	    const coreAttrsNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
	    const coreAttributes = _.pick(data, coreAttrsNames);
	    const secondaryAttributes = _.omit(data, coreAttrsNames, 'spells', 'content_srd');
	    const contentSrd = _.pick(data, 'content_srd');
	    const jsonSpells = data.spells;
	    const msg = this.reporter.getMessageStreamer(`${character.get('name')} Import`);
	    let charPromise = Promise.resolve(character);
	    if (!this.roll20.getAttrByName(character.id, 'version')) {
	      charPromise = this.runImportStage(character, { sheet_opened: 1 }, 'Creating character', msg);
	    }

	    return charPromise
	      .then(newChar => this.runImportStage(newChar, coreAttributes, 'Importing core attributes', msg))
	      .then(newChar => this.runImportStage(newChar, secondaryAttributes, 'Importing secondary attributes', msg))
	      .then(newChar => this.runImportStage(newChar, contentSrd, 'Importing srd content', msg))
	      .then(newChar =>
	        this.runImportStage(newChar, this.getSpellAttributesForImport(newChar, pronounInfo, jsonSpells, false),
	          'Importing spells', msg))
	      .then(newChar => this.runImportStage(newChar, { processing: '' }, 'Importing complete', msg))
	      .then((newChar) => {
	        msg.finish();
	        return newChar;
	      });
	  }

	  getSpellAttributesForCharacter(char) {
	    return _.chain(this.roll20.findObjs({ type: 'attribute', characterid: char.id }))
	      .filter(attribute => attribute.get('name').match(/^repeating_spell.*/))
	      .groupBy(attribute => attribute.get('name').match(/repeating_spell[\d]_([^_]+)_/)[1])
	      .reduce((memo, spellAttrGroup, rowId) => {
	        const nameAttr = spellAttrGroup
	          .find(attribute => attribute.get('name').match(/^repeating_spell[\d]_[^_]+_name$/));
	        if (!nameAttr) {
	          return memo;
	        }

	        const name = nameAttr.get('current').replace(/\*/g, '').trim();
	        const level = nameAttr.get('name').match(/^repeating_spell([\d])_[^_]+_name$/)[1];
	        const hasContent = _.some(spellAttrGroup,
	          attribute => attribute.get('name').match(/^repeating_spell[\d]_[^_]+_content/));
	        memo[name.toLowerCase()] = {
	          name,
	          attributes: spellAttrGroup,
	          hasContent,
	          rowId,
	          level,
	        };
	        return memo;
	      }, {})
	      .value();
	  }

	  getSpellAttributesForImport(char, pronounInfo, newSpells, overwrite) {
	    const spells = this.getSpellAttributesForCharacter(char);

	    const spellsToHydrate = _.chain(spells)
	      .pick(spell => !spell.hasContent)
	      .map((spell) => {
	        const bareName = spell.name.replace(/\([^)]+\)/g, '').trim();
	        const spellObject = this.entityLookup.findEntity('spells', bareName);
	        if (spellObject) {
	          spellObject.name = spell.name;
	          spellObject.rowId = spell.rowId;
	        }
	        return spellObject;
	      })
	      .compact()
	      .value();

	    this.logger.debug('Existing Spells $$$', spells);
	    const jsonSpellsToAdd = _.chain(newSpells)
	      .map((spell, index) => {
	        this.logger.debug('Checking for existing spell $$$', spell.name);
	        const existingSpell = spells[spell.name.toLowerCase()];
	        if (existingSpell) {
	          this.logger.debug('Existing spell $$$', existingSpell);
	          let newData = null;
	          if (overwrite && existingSpell.hasContent) {
	            spell.rowId = existingSpell.rowId;
	            _.invoke(existingSpell.attributes, 'remove');
	            newData = spell;
	          }
	          else if (!overwrite) {
	            delete newSpells[index];
	          }
	          return newData;
	        }

	        return spell;
	      })
	      .compact()
	      .value();

	    return this.srdConverter.convertSpells(spellsToHydrate.concat(jsonSpellsToAdd), pronounInfo);
	  }

	  runImportStage(character, attributes, name, msgStreamer) {
	    const initialPromise = Promise.resolve(character);
	    if (!_.isEmpty(attributes)) {
	      this.logger.debug('Importing attributes for stage $$$: $$$', name, attributes);
	      msgStreamer.stream(name);
	      this.logger.debug(`${name} start`);
	      if (this.logger.getLogLevel() >= Logger.levels.DEBUG) {
	        this.logger.debug('Character attributes at start: $$$',
	          this.roll20.findObjs({ type: 'attribute', characterid: character.id }));
	      }

	      return _.chain(attributes)
	        .reduce((executionGroups, attrVal, attrName) => {
	          const lastGroupSize = _.size(executionGroups[executionGroups.length - 1]);
	          if (lastGroupSize >= 50) {
	            executionGroups.push({ attrName: attrVal });
	          }
	          else {
	            executionGroups[executionGroups.length - 1][attrName] = attrVal;
	          }
	          return executionGroups;
	        }, [{}])
	        .reduce((promise, executionGroup, index) =>
	            promise
	              .then((newChar) => {
	                const newPromise = new Promise(resolve => this.roll20.onSheetWorkerCompleted(() => {
	                  this.logger.debug(`Sheet worker completed for ${name} ${index}`);
	                  resolve(newChar);
	                }));
	                _.each(executionGroup, (attrVal, attrName) => {
	                  this.roll20.setAttrWithWorker(character.id, attrName, attrVal);
	                });
	                return newPromise;
	              })
	              .then(newChar => this.fixRoll20Brokenness(newChar))
	          , initialPromise)
	        .value();
	    }
	    return initialPromise;
	  }

	  getPronounInfo(character) {
	    const gender = this.roll20.getAttrByName(character.id, 'gender');

	    const defaultIndex = Math.min(this.myState.config.defaultGenderIndex, this.myState.config.genderPronouns.length);
	    const defaultPronounInfo = this.myState.config.genderPronouns[defaultIndex];
	    const pronounInfo = _.clone(_.find(this.myState.config.genderPronouns,
	        pronounDetails => new RegExp(pronounDetails.matchPattern, 'i').test(gender)) || defaultPronounInfo);
	    _.defaults(pronounInfo, defaultPronounInfo);
	    return pronounInfo;
	  }


	  getTokenRetrievalStrategy(token) {
	    return (name, errors) => {
	      if (token) {
	        const character = this.roll20.getObj('character', token.get('represents'));
	        if (character && this.roll20.getAttrByName(character.id, 'locked')) {
	          errors.push(`Character with name ${character.get('name')} and id ${character.id}` +
	            ' was locked and cannot be overwritten');
	          return null;
	        }
	        return character;
	      }
	      return null;
	    };
	  }

	  nameRetrievalStrategy(name, errors) {
	    const chars = this.roll20.findObjs({ type: 'character', name });
	    if (chars.length > 1) {
	      errors.push(`More than one existing character found with name "${name}". Can't replace`);
	      return null;
	    }

	    if (chars[0] && this.roll20.getAttrByName(chars[0].id, 'locked')) {
	      errors.push(`Character with name ${chars[0].get('name')} and id ${chars[0].id}` +
	        ' was locked and cannot be overwritten');
	      return null;
	    }

	    return chars[0];
	  }

	  creationRetrievalStrategy(name, errors) {
	    if (!_.isEmpty(this.roll20.findObjs({ type: 'character', name }))) {
	      errors.push(`Can't create new character with name "${name}` +
	        '" because one already exists with that name. Perhaps you want --replace?');
	      return null;
	    }

	    return this.roll20.createObj('character', { name });
	  }

	  getAvatarCopier(token) {
	    return function avatarCopier(character) {
	      character.set('avatar', token.get('imgsrc'));
	      return character;
	    };
	  }

	  applyCharacterDefaults(character) {
	    const completionPromise = new Promise(resolve => this.roll20.onSheetWorkerCompleted(() => resolve(character)));
	    const defaults = _.chain(utils.flattenObject(_.omit(this.myState.config.newCharSettings, 'tokenActions')))
	      .reduce((result, value, key) => {
	        const attrName = ShapedConfig.configToAttributeLookup[key];
	        if (attrName) {
	          result[attrName] = value;
	        }
	        return result;
	      }, {})
	      .value();

	    this.logger.debug('Setting character defaults $$$', defaults);

	    _.each(defaults, (value, key) => {
	      const attribute = this.roll20.getOrCreateAttr(character.id, key);
	      if (value === '***default***' || (_.isBoolean(value) && !value)) {
	        attribute.removeWithWorker();
	      }
	      else {
	        attribute.setWithWorker('current', _.isBoolean(value) ? 1 : value);
	      }
	    });
	    return completionPromise.then(() => {
	      this.logger.debug('Finished setting character defaults for $$$', character.get('name'));
	      return character;
	    });
	  }

	  createTokenActions(character) {
	    const abilityNames = _.chain(this.myState.config.newCharSettings.tokenActions)
	      .omit('showRecharges')
	      .map((action, actionName) => (action === true ? actionName : action))
	      .compact()
	      .values()
	      .value();
	    this.abilityMaker.addAbilitiesByName(abilityNames, character,
	      this.myState.config.newCharSettings.tokenActions.showRecharges);
	    return character;
	  }

	  getTokenConfigurer(token, monsterImport) {
	    return (character) => {
	      const isNpcLiteral = this.roll20.getAttrByName(character.id, 'is_npc');
	      const isNpc = (isNpcLiteral === 1 || isNpcLiteral === '1' || monsterImport);
	      this.logger.debug('isNPC $$$ $$$', isNpcLiteral, isNpc);
	      token.set('represents', character.id);
	      const settings = this.myState.config.tokenSettings;
	      const name = _.isEmpty(settings.monsterTokenName) ? character.get('name') : settings.monsterTokenName;
	      token.set('name', name);
	      if (settings.number && isNpc && token.get('name').indexOf('%%NUMBERED%%') === -1) {
	        token.set('name', `${token.get('name')} %%NUMBERED%%`);
	      }

	      _.chain(settings)
	        .pick(['bar1', 'bar2', 'bar3'])
	        .each((bar, barName) => {
	          if (!_.isEmpty(bar.attribute)) {
	            // We create attribute here to ensure we have control over the id
	            const attribute = this.roll20.getOrCreateAttr(character.id, bar.attribute);
	            if (attribute) {
	              if (bar.link) {
	                token.set(`${barName}_link`, attribute.id);
	              }
	              else {
	                token.set(`${barName}_link`, '');
	              }
	              token.set(`${barName}_value`, attribute.get('current'));
	              if (bar.max) {
	                token.set(`${barName}_max`, attribute.get('max'));
	              }
	              else {
	                token.set(`${barName}_max`, '');
	              }
	              token.set(`showplayers_${barName}`, bar.showPlayers);
	            }
	          }
	        });

	      // auras
	      _.chain(settings)
	        .pick(['aura1', 'aura2'])
	        .each((aura, auraName) => {
	          token.set(`${auraName}_radius`, aura.radius);
	          token.set(`${auraName}_color`, aura.color);
	          token.set(`${auraName}_square`, aura.square);
	        });

	      this.logger.debug('Settings for tokens: $$$', settings);
	      token.set('showname', settings.showName);
	      token.set('showplayers_name', settings.showNameToPlayers);
	      token.set('showplayers_aura1', settings.showAura1ToPlayers);
	      token.set('showplayers_aura2', settings.showAura2ToPlayers);
	      token.set('light_radius', settings.light.radius);
	      token.set('light_dimradius', settings.light.dimRadius);
	      token.set('light_otherplayers', settings.light.otherPlayers);
	      token.set('light_hassight', settings.light.hasSight);
	      token.set('light_angle', settings.light.angle);
	      token.set('light_losangle', settings.light.losAngle);
	      token.set('light_multiplier', settings.light.multiplier);
	      return character;
	    };
	  }

	  getTokenVisionConfigurer(token, sensesString) {
	    if (_.isEmpty(sensesString)) {
	      this.logger.debug('Empty senses string, using default values');
	      return _.identity;
	    }

	    function fullRadiusLightConfigurer() {
	      token.set('light_radius', Math.max(token.get('light_radius') || 0, this.lightRadius));
	      token.set('light_dimradius', Math.max(token.get('light_dimradius') || 0, this.lightRadius));
	    }

	    function darkvisionLightConfigurer() {
	      token.set('light_radius', Math.max(token.get('light_radius') || 0, Math.round(this.lightRadius * 1.1666666)));
	      if (!token.get('light_dimradius')) {
	        token.set('light_dimradius', -5);
	      }
	    }

	    const configureFunctions = {
	      blindsight: fullRadiusLightConfigurer,
	      truesight: fullRadiusLightConfigurer,
	      tremorsense: fullRadiusLightConfigurer,
	      darkvision: darkvisionLightConfigurer,
	    };

	    const re = /(blindsight|darkvision|tremorsense|truesight)\s+(\d+)/;
	    let match;
	    const senses = [];
	    while ((match = sensesString.match(re))) {
	      senses.push({
	        name: match[1],
	        lightRadius: parseInt(match[2], 10),
	        configureVision: configureFunctions[match[1]],
	      });
	      sensesString = sensesString.slice(match.index + match[0].length);
	    }

	    return function configureTokenVision(character) {
	      senses.forEach(sense => sense.configureVision());
	      return character;
	    };
	  }

	  getDefaultTokenPersister(token) {
	    return (character) => {
	      this.roll20.setDefaultTokenForCharacter(character, token);
	      return character;
	    };
	  }

	  updateCharacter(options) {
	    if (options.all) {
	      options.selected.character = this.roll20.findObjs({ type: 'character' });
	    }

	    if (_.isEmpty(options.selected.character)) {
	      this.reportError('You have no tokens selected that represent characters, and you did not specify --all');
	      return null;
	    }
	    const count = options.selected.character.length;
	    const msg = this.reporter.getMessageStreamer(`Updating ${count} characters`);
	    return options.selected.character.reduce((promise, character, index) =>
	        promise.then(() => {
	          const sheetOpened = this.roll20.getAttrByName(character.id, 'sheet_opened');
	          return this
	            .runImportStage(character, { sheet_opened: sheetOpened === 1 ? 0 : 1 },
	              `Updating character ${index + 1} - ${character.get('name')}`, msg)
	            .then(() => this.runImportStage(character, { processing: '' }, 'Updating complete', msg));
	        }),
	      Promise.resolve())
	      .then(() => {
	        msg.finish();
	        this.reportPlayer('Update Complete', `${count} characters checked/updated`);
	      });
	  }

	  expandSpells(options) {
	    return options.selected.character.reduce((promise, character) =>
	        promise.then(() => this.importData(character, [])),
	      Promise.resolve())
	      .then(() => {
	        const msg = ' Spell expanded for characters: <ul><li>' +
	          `${options.selected.character.map(char => char.get('name')).join('</li><li>')}</li></ul>`;
	        this.reporter.reportPlayer('Spell Expansion Complete', msg);
	      });
	  }
	}

	module.exports = Importer;


/***/ },
/* 24 */
/***/ function(module, exports) {

	'use strict';
	function sanitise(statblock, logger, noOcrFixes) {
	  logger.debug('Pre-sanitise: $$$', statblock);
	  statblock = statblock
	    .replace(/\s+([.,;:])/g, '$1')
	      .replace(/\n+/g, '#')
	      .replace(/–/g, '-')
	      .replace(/‒/g, '-')
	      .replace(/−/g, '-') // Watch out: this and the two lines above containing funny unicode versions of '-'
	      .replace(/’/gi, '\'')
	      .replace(/<br[^>]*>/g, '#')
	      .replace(/#+/g, '#')
	      .replace(/\s*#\s*/g, '#')
	      .replace(/(<([^>]+)>)/gi, '')
	      .replace(/legendary actions/gi, 'Legendary Actions')
	      .replace(/(\S)\sACTIONS/, '$1#ACTIONS')
	      .replace(/LAIR#ACTIONS/gi, 'LAIR ACTIONS')
	      .replace(/#(?=[a-z]|DC)/g, ' ')
	      .replace(/\s+/g, ' ')
	      .replace(/#Hit:/gi, 'Hit:')
	      .replace(/Hit:#/gi, 'Hit: ')
	      .replace(/#Each /gi, 'Each ')
	      .replace(/#On a successful save/gi, 'On a successful save')
	      .replace(/DC#(\d+)/g, 'DC $1')
	      .replace('LanguagesChallenge', 'Languages -\nChallenge')
	      .replace('\' Speed', 'Speed')
	    .replace(/(\w+) s([\s.,])/g, '$1s$2')
	      .replace(/#Medium or/gi, ' Medium or')
	      .replace(/take#(\d+)/gi, 'take $1')
	      .replace(/#/g, '\n')
	      .replace(/&gt;/g, '>')
	      .replace(/&lt;/g, '<')
	      .replace(/&amp;/g, '&');


	  logger.debug('First stage cleaned statblock: $$$', statblock);

	  // Sometimes the texts ends up like 'P a r a l y z i n g T o u c h . M e l e e S p e l l A t t a c k : + 1 t o h i t
	  // In this case we can fix the title case stuff, because we can find the word boundaries. That will at least meaning
	  // that the core statblock parsing will work. If this happens inside the lowercase body text, however, there's
	  // nothing we can do about it because you need to understand the natural language to reinsert the word breaks
	  // properly.
	  statblock = statblock.replace(/([A-Z])(\s[a-z]){2,}/g, (match, p1) =>
	      p1 + match.slice(1).replace(/\s([a-z])/g, '$1')
	  );


	  // Conversely, sometimes words get mushed together. Again, we can only fix this for title case things, but that's
	  // better than nothing
	  statblock = statblock.replace(/([A-Z][a-z]+)(?=[A-Z])/g, '$1 ');

	  // This covers abilites that end up as 'C O N' or similar
	  statblock = statblock.replace(/^[A-Z]\s?[A-Z]\s?[A-Z](?=\s|$)/mg, match => match.replace(/\s/g, ''));

	  statblock = statblock.replace(/^[A-Z '()-]+$/mg, match =>
	      match.replace(/([A-Z])([A-Z'-]+)(?=\s|\)|$)/g, (innerMatch, p1, p2) => p1 + p2.toLowerCase())
	  );


	  statblock = statblock.replace(/(\d+)\s*?plus\s*?((?:\d+d\d+)|(?:\d+))/gi, '$2 + $1');
	  /* eslint-disable quote-props */
	  if (!noOcrFixes) {
	    const replaceObj = {
	      'Jly': 'fly',
	      ',1\'': ',*',
	      'jday': '/day',
	      'abol eth': 'aboleth',
	      'ACT IONS': 'ACTIONS',
	      'Afrightened': 'A frightened',
	      'Alesser': 'A lesser',
	      'Athl etics': 'Athletics',
	      'blindn ess': 'blindness',
	      'blind sight': 'blindsight',
	      'bofh': 'both',
	      'brea stplate': 'breastplate',
	      'Can trips': 'Cantrips',
	      'choos in g': 'choosing',
	      'com muni cate': 'communicate',
	      'Constituti on': 'Constitution',
	      'creatu re': 'creature',
	      'darkvi sion': 'darkvision',
	      'dea ls': 'deals',
	      'di sease': 'disease',
	      'di stance': 'distance',
	      'fa lls': 'falls',
	      'fe et': 'feet',
	      'exha les': 'exhales',
	      'ex istence': 'existence',
	      'lfthe': 'If the',
	      'Ifthe': 'If the',
	      'ifthe': 'if the',
	      'lnt': 'Int',
	      'magica lly': 'magically',
	      'Med icine': 'Medicine',
	      'minlilte': 'minute',
	      'natura l': 'natural',
	      'ofeach': 'of each',
	      'ofthe': 'of the',
	      'on\'e': 'one',
	      'on ly': 'only',
	      '0n': 'on',
	      'pass ive': 'passive',
	      'Perce ption': 'Perception',
	      'radi us': 'radius',
	      'ra nge': 'range',
	      'rega ins': 'regains',
	      'rest.oration': 'restoration',
	      'savin g': 'saving',
	      'si lvery': 'silvery',
	      's lashing': 'slashing',
	      'slas hing': 'slashing',
	      'slash in g': 'slashing',
	      'slash ing': 'slashing',
	      'Spel/casting': 'Spellcasting',
	      'successfu l': 'successful',
	      'ta rget': 'target',
	      ' Th e ': ' The ',
	      't_urns': 'turns',
	      'unti l': 'until',
	      'withi n': 'within',
	      'tohit': 'to hit',
	      'At wi ll': 'At will',
	      'per-son': 'person',
	      'ab ility': 'ability',
	      'spe ll': 'spell',
	    };
	    /* eslint-enable quote-props */

	    const re = new RegExp(Object.keys(replaceObj).join('|'), 'g');
	    statblock = statblock.replace(re, matched => replaceObj[matched]);

	    statblock = statblock
	        .replace(/,\./gi, ',')
	        .replace(/:\./g, ':')
	        .replace(/(\W)l(\W)/g, '$11$2')
	        .replace(/\.([\w])/g, '. $1')
	        .replace(/1</g, '*')
	        .replace(/(\w)ii/g, '$1ll')
	      .replace(/([a-z/])1/g, '$1l')
	        .replace(/([a-z])\/([a-z])/g, '$1l$2')
	        .replace(/blindnessldeafness/g, 'blindness/deafness')
	        .replace(/(^| )l /gm, '$11 ')
	        .replace(/ft\s+\./gi, 'ft.')
	        .replace(/ft\.\s,/gi, 'ft.,')
	        .replace(/\bft\b(?!\.)/gi, 'ft.')
	        .replace(/(\d+) ft\/(\d+) ft/gi, '$1/$2 ft')
	        .replace(/lOd/g, '10d')
	        .replace(/dl0/gi, 'd10')
	        .replace(/dlO/gi, 'd10')
	        .replace(/dl2/gi, 'd12')
	        .replace(/S(\d+)d(\d+)/gi, '5$1d$2')
	        .replace(/l(\d+)d(\d+)/gi, '1$1d$2')
	        .replace(/ld(\d+)/gi, '1d$1')
	        .replace(/l(\d+)d\s+(\d+)/gi, '1$1d$2')
	        .replace(/(\d+)d\s+(\d+)/gi, '$1d$2')
	        .replace(/(\d+)\s+d(\d+)/gi, '$1d$2')
	        .replace(/(\d+)\s+d(\d+)/gi, '$1d$2')
	        .replace(/(\d+)d(\d)\s(\d)/gi, '$1d$2$3')
	        .replace(/(\d+)j(?:Day|day)/gi, '$1/Day')
	        .replace(/(\d+)f(?:Day|day)/gi, '$1/Day')
	        .replace(/(\d+)j(\d+)/gi, '$1/$2')
	        .replace(/(\d+)f(\d+)/gi, '$1/$2')
	        .replace(/{/gi, '(')
	        .replace(/}/gi, ')')
	        .replace(/(\d+)\((\d+) ft/gi, '$1/$2 ft');

	    logger.debug('Final stage cleaned statblock: $$$', statblock);
	  }
	  return statblock;
	}

	module.exports = sanitise;


/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	const _ = __webpack_require__(2);
	const utils = __webpack_require__(7);

	function getRenameMapper(newName, upperCaseValue) {
	  return function renameMapper(key, value, output) {
	    output[newName] = upperCaseValue && value ? value.toUpperCase() : value;
	  };
	}

	function upperCaseMapper(key, value, output) {
	  output[key] = value ? value.toUpperCase() : value;
	}

	function identityMapper(key, value, output) {
	  output[key] = value;
	}

	function booleanMapper(key, value, output) {
	  if (value) {
	    output[key] = 'Yes';
	  }
	}

	function durationMapper(key, value, output, spellObj) {
	  let newDuration = spellObj.concentration ? 'CONCENTRATION_' : '';
	  newDuration += value.toUpperCase().replace(/\s/g, '_');
	  output[key] = newDuration;
	}

	function spellLevelMapper(key, value, output) {
	  let spellLevel;
	  if (value === 0) {
	    spellLevel = 'CANTRIP';
	  }
	  else {
	    switch (value % 10) {
	      case 1:
	        spellLevel = `${value}ST_LEVEL`;
	        break;
	      case 2:
	        spellLevel = `${value}ND_LEVEL`;
	        break;
	      case 3:
	        spellLevel = `${value}RD_LEVEL`;
	        break;
	      default:
	        spellLevel = `${value}TH_LEVEL`;
	        break;
	    }
	  }
	  output.spell_level = spellLevel;
	  output.level = value;
	}

	function camelCaseFixMapper(key, value, output) {
	  const newKey = utils.camelToSnakeCase(key);
	  output[newKey] = value;
	}

	function getCastingStatMapper(prefix) {
	  return function castingStatMapper(key, value, output) {
	    if (value) {
	      output[`${prefix}_ability`] = 'SPELL_ABILITY';
	    }
	  };
	}

	function castingTimeMapper(key, value, output) {
	  output.casting_time = value && value.toUpperCase().replace(/\s/g, '_');
	}


	function componentMapper(key, value, output) {
	  const components = _.chain(value)
	    .omit('materialCost')
	    .map((propValue, propName) => {
	      if (propName !== 'materialMaterial') {
	        return propName.toUpperCase().slice(0, 1);
	      }

	      output.materials = propValue;
	      return null;
	    })
	    .compact()
	    .value()
	    .join('_');

	  if (components) {
	    output.components = `COMPONENTS_${components}`;
	  }
	}

	function attackTypeMapper(key, value, output) {
	  switch (value) {
	    case 'ranged':
	      output.attack_type = 'RANGED_SPELL_ATTACK';
	      break;
	    default:
	      output.attack_type = 'MELEE_SPELL_ATTACK';
	  }
	}

	function getDiceExploder(prefix) {
	  return function damageMapper(key, value, output) {
	    const match = value.match(/^(.+)(d[\d]+)$/);
	    if (match) {
	      output[`${prefix}_dice`] = match[1];
	      output[`${prefix}_die`] = match[2];
	    }
	  };
	}

	function getDamageMapper(prefix) {
	  return getDiceExploder(`${prefix}_damage`);
	}

	function getSecondaryDamageMapper(prefix) {
	  const valueMapper = getDamageMapper(`${prefix}_second`);
	  return function secondaryDamagerMapper(key, value, output) {
	    valueMapper(key, value, output);
	    output[`${prefix}_second_damage_condition`] = 'PLUS';
	  };
	}

	function getPrefixCamelCaseFixMapper(prefix) {
	  return function prefixCamelCaseFixMapper(key, value, output) {
	    const newKey = `${prefix}_${utils.camelToSnakeCase(key)}`;
	    output[newKey] = value;
	  };
	}

	function getSaveAttackMappings(prefix) {
	  return {
	    ability: getRenameMapper('saving_throw_vs_ability', true),
	    type: attackTypeMapper,
	    damage: getDamageMapper(prefix),
	    damageBonus: getPrefixCamelCaseFixMapper(prefix),
	    damageType: getPrefixCamelCaseFixMapper(prefix),
	    saveSuccess: getRenameMapper('saving_throw_success'),
	    higherLevelDice: getPrefixCamelCaseFixMapper(prefix),
	    secondaryDamage: getSecondaryDamageMapper(prefix),
	    secondaryDamageBonus: getRenameMapper(`${prefix}_second_damage_bonus`),
	    secondaryDamageType: getRenameMapper(`${prefix}_second_damage_type`),
	    higherLevelSecondaryDice: getRenameMapper(`${prefix}_second_higher_level_dice`),
	    higherLevelSecondaryDie: getRenameMapper(`${prefix}_second_higher_level_die`),
	    castingStat: getCastingStatMapper(`${prefix}_damage`),
	    secondaryCastingStat: getCastingStatMapper(`${prefix}_second_damage`),
	  };
	}

	function getObjectMapper(mappings) {
	  return function objectMapper(key, value, output) {
	    _.each(value, (propVal, propName) => {
	      const mapper = mappings[propName];
	      if (!mapper) {
	        throw new Error('Unrecognised property when attempting to convert to srd format: ' +
	          `[${propName}] ${JSON.stringify(output)}`);
	      }
	      mapper(propName, propVal, output, value);
	    });
	  };
	}

	const spellMapper = getObjectMapper({
	  name: identityMapper,
	  duration: durationMapper,
	  level: spellLevelMapper,
	  school: upperCaseMapper,
	  emote: identityMapper,
	  range: identityMapper,
	  castingTime: castingTimeMapper,
	  target: identityMapper,
	  description: getRenameMapper('content'),
	  higherLevel: camelCaseFixMapper,
	  ritual: booleanMapper,
	  concentration: booleanMapper,
	  save: getObjectMapper(getSaveAttackMappings('saving_throw')),
	  attack: getObjectMapper(getSaveAttackMappings('attack')),
	  damage: getObjectMapper(getSaveAttackMappings('other')),
	  heal: getObjectMapper({
	    heal: getDiceExploder('heal'),
	    castingStat: getCastingStatMapper('heal'),
	    higherLevelDice: camelCaseFixMapper,
	    higherLevelAmount: getRenameMapper('higher_level_heal'),
	    bonus: getRenameMapper('heal_bonus'),
	  }),
	  components: componentMapper,
	  prepared(key, value, output) {
	    if (value) {
	      output.is_prepared = 'on';
	    }
	  },
	  classes: _.noop,
	  aoe: _.noop,
	  source: _.noop,
	  effects: _.noop,
	  domains: _.noop,
	  oaths: _.noop,
	  circles: _.noop,
	  patrons: _.noop,
	  rowId: identityMapper,
	});


	const monsterMapper = getObjectMapper({
	  name: getRenameMapper('character_name'),
	  size: identityMapper,
	  type: identityMapper,
	  alignment: identityMapper,
	  AC: getRenameMapper('ac_srd'),
	  HP: getRenameMapper('hp_srd'),
	  speed: getRenameMapper('npc_speed'),
	  strength: identityMapper,
	  dexterity: identityMapper,
	  constitution: identityMapper,
	  intelligence: identityMapper,
	  wisdom: identityMapper,
	  charisma: identityMapper,
	  skills: getRenameMapper('skills_srd'),
	  savingThrows: getRenameMapper('saving_throws_srd'),
	  damageResistances: getRenameMapper('damage_resistances'),
	  damageImmunities: getRenameMapper('damage_immunities'),
	  conditionImmunities: getRenameMapper('condition_immunities'),
	  damageVulnerabilities: getRenameMapper('damage_vulnerabilities'),
	  senses: identityMapper,
	  languages: identityMapper,
	  challenge: identityMapper,
	  traits: identityMapper,
	  actions: identityMapper,
	  reactions: identityMapper,
	  regionalEffects: identityMapper,
	  regionalEffectsFade: identityMapper,
	  legendaryPoints: identityMapper,
	  legendaryActions: identityMapper,
	  lairActions: identityMapper,
	  spells: _.noop,
	});

	const pronounTokens = {
	  '{{GENDER_PRONOUN_HE_SHE}}': 'nominative',
	  '{{GENDER_PRONOUN_HIM_HER}}': 'accusative',
	  '{{GENDER_PRONOUN_HIS_HER}}': 'possessive',
	  '{{GENDER_PRONOUN_HIMSELF_HERSELF}}': 'reflexive',
	};


	module.exports = {

	  convertMonster(npcObject) {
	    const output = {};
	    monsterMapper(null, npcObject, output);

	    const actionTraitTemplate = _.template('**<%=data.name%>' +
	      '<% if(data.recharge) { print(" (" + data.recharge + ")") } %>**: <%=data.text%>', { variable: 'data' });
	    const legendaryTemplate = _.template('**<%=data.name%>' +
	      '<% if(data.cost && data.cost > 1){ print(" (Costs " + data.cost + " actions)") }%>**: <%=data.text%>',
	      { variable: 'data' });

	    function lairRegionalTemplate(item) {
	      return `\u2022 ${item}`;
	    }

	    const simpleSectionTemplate = _.template('\n <%=data.title%>\n<% print(data.items.join("\\n")); %>',
	      { variable: 'data' });
	    const legendarySectionTemplate = _.template('\n <%=data.title%>\n' +
	      'The <%=data.name%> can take <%=data.legendaryPoints%> legendary actions, choosing from the options below. ' +
	      'It can take only one legendary action at a time and only at the end of another creature\'s turn. ' +
	      'The <%=data.name%> regains spent legendary actions at the start of its turn.\n' +
	      '<% print(data.items.join("\\n")) %>', { variable: 'data' });
	    const regionalSectionTemplate = _.template(' <%=data.title%>\n<% print(data.items.join("\\n")); %>\n' +
	      '**<%=data.regionalEffectsFade%>', { variable: 'data' });

	    const srdContentSections = [
	      { prop: 'lairActions', itemTemplate: lairRegionalTemplate, sectionTemplate: simpleSectionTemplate },
	      { prop: 'regionalEffects', itemTemplate: lairRegionalTemplate, sectionTemplate: regionalSectionTemplate },
	      { prop: 'traits', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate },
	      { prop: 'actions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate },
	      { prop: 'reactions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate },
	      { prop: 'legendaryActions', itemTemplate: legendaryTemplate, sectionTemplate: legendarySectionTemplate },
	    ];

	    function makeDataObject(propertyName, itemList) {
	      return {
	        title: propertyName.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, letter => letter.toUpperCase()),
	        name: output.character_name,
	        legendaryPoints: output.legendaryPoints,
	        regionalEffectsFade: output.regionalEffectsFade,
	        items: itemList,
	      };
	    }

	    output.is_npc = 1;
	    output.edit_mode = 0;

	    output.content_srd = _.chain(srdContentSections)
	      .map((sectionSpec) => {
	        const items = output[sectionSpec.prop];
	        delete output[sectionSpec.prop];
	        return _.map(items, sectionSpec.itemTemplate);
	      })
	      .map((sectionItems, sectionIndex) => {
	        const sectionSpec = srdContentSections[sectionIndex];
	        if (!_.isEmpty(sectionItems)) {
	          return sectionSpec.sectionTemplate(makeDataObject(sectionSpec.prop, sectionItems));
	        }

	        return null;
	      })
	      .compact()
	      .value()
	      .join('\n');


	    delete output.legendaryPoints;

	    return output;
	  },


	  convertSpells(spellObjects, pronounInfo) {
	    const result = _.chain(spellObjects)
	      .map((spellObject) => {
	        const converted = {};
	        spellMapper(null, spellObject, converted);
	        converted.toggle_details = 0;
	        if (converted.emote) {
	          _.each(pronounTokens, (pronounType, token) => {
	            const replacement = pronounInfo[pronounType];
	            converted.emote = converted.emote.replace(new RegExp(token, 'g'), replacement);
	          });
	        }
	        return converted;
	      })
	      .reduce((attrsObject, spellProps) => {
	        const rowId = spellProps.rowId || utils.generateRowID();
	        _.each(_.omit(spellProps, 'rowId', 'level'), (propVal, propName) => {
	          attrsObject[`repeating_spell${spellProps.level}_${rowId}_${propName}`] = propVal;
	        });
	        return attrsObject;
	      }, {})
	      .value();

	    if (!_.isEmpty(result)) {
	      result.show_spells = 1;
	    }
	    return result;
	  },
	};


/***/ }
/******/ ]);