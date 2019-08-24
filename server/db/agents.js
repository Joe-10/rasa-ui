const db = require('./db');
const logger = require('../util/logger');

function getAllAgents(req, res, next) {
  logger.winston.info('Agent.getAllAgents');
  db.all('select * from agents order by agent_id desc', function(err, data) {
    if (err) {
      logger.winston.info(err);
    } else {
      res.status(200).json(data);
    }
  });
}

function getSingleAgent(req, res, next) {
  logger.winston.info('Agent.getSingleAgent');
  db.get('select * from agents where agent_id = ?', req.params.agent_id, function(err, data) {
    if (err) {
      logger.winston.info(err);
    } else {
      res.status(200).json(data);
    }
  });
}

function createAgent(req, res, next) {
  logger.winston.info('Agent.createAgent');
  db.run('insert into agents(agent_name, agent_config, output_folder)' + 'values (?,?,?)', [req.body.agent_name, req.body.agent_config, req.body.output_folder], function(err) {
    if (err) {
      logger.winston.info("Error inserting a new record");
    } else {
      res.status(200).json({ status: 'success', message: 'Inserted' });
    }
  });
}

function updateAgent(req, res, next) {
  logger.winston.info('Agent.updateAgent');
  db.run('update agents set agent_name = ?, output_folder = ?, agent_config = ? where agent_id = ?', [req.body.agent_name, req.body.output_folder, req.body.agent_config, req.body.agent_id], function(err) {
    if (err) {
      logger.winston.info("Error updating the record");
    } else {
      res.status(200).json({ status: 'success', message: 'Updated' });
    }
  });
}

function removeAgent(req, res) {
  logger.winston.info('Agent.updateAgent');
  db.run('delete from agents where agent_id = ?', req.params.agent_id, function(err) {
    if (err) {
      logger.winston.info("Error removing the record");
    } else {
      res.status(200).json({ status: 'success', message: 'Removed' });
    }
  });
}

module.exports = {
  getSingleAgent,
  getAllAgents,
  createAgent,
  updateAgent,
  removeAgent,
  uploadAgentFromFile,
  updateAgentStory
};


function updateAgentStory(req, res, next) {
  logger.winston.info('Agent.updateAgentStory -- Not done');
  /*
  db.none('update agents set story_details=$2 where agent_id=$1', [
    Number(req.body.agent_id),
    req.body.story_details])
    .then(function() {
      res.status(200).json({
        status: 'success',
        message: 'Updated Story For Agent'});
    })
    .catch(function(err) {
      return next(err);
    });
    */
}


function uploadAgentFromFile(req, res, next) {
  /*
  logger.winston.info('On server request' + JSON.stringify(req.body));

  //agent, intent,expressions, entities, , parameters(expression id, entity id)
  const intents_map = new Map();
  const entities_map = new Map();
  const entities_set = new Set();
  const nlu_data_common_examples = req.body.data.rasa_nlu_data.common_examples;
  const regex_set = req.body.data.rasa_nlu_data.regex_features;
  const synonyms_set = req.body.data.rasa_nlu_data.entity_synonyms;
  //modify the data structure for db queries
  logger.winston.info(
    'Starting upload... Array Length :' + nlu_data_common_examples.length
  );
  for (let i = 0; i < nlu_data_common_examples.length; i++) {
    logger.winston.info(
      `Iteration No : ${i} Intent: ${nlu_data_common_examples[i].intent}`
    );
    let expressions_arr;
    if (intents_map.has(nlu_data_common_examples[i].intent)) {
      expressions_arr = intents_map.get(nlu_data_common_examples[i].intent);
    } else {
      expressions_arr = [];
    }
    const expressionObj = {};
    expressionObj.text = nlu_data_common_examples[i].text;
    expressionObj.paramArray = [];
    const intentEntities = nlu_data_common_examples[i].entities || [];
    for (let j = 0; j < intentEntities.length; j++) {
      const entityObj = intentEntities[j];
      entities_set.add(entityObj.entity);
      const parameterObj = {};
      parameterObj.entity = entityObj.entity;
      parameterObj.entity_id = -1;
      parameterObj.parameter_value = entityObj.value;
      parameterObj.start = entityObj.start;
      parameterObj.end = entityObj.end;
      expressionObj.paramArray.push(parameterObj);
      logger.winston.info('Adding param for ' + parameterObj.parameter_value);
    }

    expressions_arr.push(expressionObj);
    intents_map.set(nlu_data_common_examples[i].intent, expressions_arr);
  }

  logger.winston.info('REGEX BD :', regex_set);
  logger.winston.info('SYNONYMS BD :', synonyms_set);

  logger.winston.info('Done Iterations. Inserting data now.');

  // data = as returned from the transaction's callback
  db.tx(function(t) {
    // t.ctx = transaction context object
    return t
      .one('insert into agents(agent_name) values($1) RETURNING agent_id', [
        req.body.agent_name])
      .then(agent => {
        logger.winston.info(
          'Agent Inserted. Inserting Entites First. These ids are needed for Intents.'
        );
        const entity_queries_arr = [];
        entities_set.forEach(function(entity) {
            const entity_query = t.one(
              'insert into entities(entity_name, agent_id, slot_data_type) values($1,$2,$3) RETURNING entity_id',
              [entity, agent.agent_id, 'NOT_USED']
            )
            .then(function(return_entity) {
              logger.winston.info(
                'Entity Inserted. Updating map for ' + entity
              );
              entities_map.set(entity, return_entity.entity_id);
            })
            .catch(function(err) {
              logger.winston.info(
                'Error occured while inserting entities: ' + err
              );
            });
          entity_queries_arr.push(entity_query);
        });
        return t
          .batch(entity_queries_arr)
          .then(() => {
            const intents_query_arr = [];
            intents_map.forEach(function(expressionsArray, key) {
              logger.winston.info('Inserting Intent ' + key);
                const intent_query = t.one(
                  'insert into intents(agent_id, intent_name) VALUES($1, $2) RETURNING intent_id',
                  [agent.agent_id, key]
                )
                .then(intent => {
                  const expressions_query_arr = [];
                  expressionsArray.forEach(function(expressionObjVal) {
                    logger.winston.info(
                      'Inserting Expression ' + expressionObjVal.text
                    );
                    const expressions_query = t.one(
                        'insert into expressions(intent_id, expression_text) values($1, $2) RETURNING expression_id',
                        [intent.intent_id, expressionObjVal.text]
                      )
                      .then(expression => {
                        const parameters_query_arr = [];
                        const p_arr = expressionObjVal.paramArray;
                        for (let j = 0; j < p_arr.length; j++) {
                          const paramObj = p_arr[j];
                          if (paramObj.entity_id === -1) {
                            //updated entityid
                            paramObj.entity_id = entities_map.get(
                              paramObj.entity
                            );
                          }
                          logger.winston.info(
                            `Inserting Parameter for ${paramObj.parameter_value},
                            Mapping to Entity: ${paramObj.entity} ,
                            with key: ${paramObj.entity_id}`
                          );
                          const params_query = t.none(
                              'insert into parameters (expression_id, parameter_end, parameter_start, parameter_value,entity_id) ' +
                              'values($1,$2,$3,$4,$5)',
                            [
                              expression.expression_id,
                              paramObj.end,
                              paramObj.start,
                              paramObj.parameter_value,
                              paramObj.entity_id]
                          );
                          parameters_query_arr.push(params_query);
                        }
                        return t.batch(parameters_query_arr);
                      });
                    expressions_query_arr.push(expressions_query);
                  });
                  return t.batch(expressions_query_arr);
                });
              intents_query_arr.push(intent_query);
            });
            return t.batch(intents_query_arr);
          })
          .then(() => {
            const regex_query_arr = [];
            if (typeof regex_set === 'undefined') {
              return;
            }
            for (let i = 0; i < regex_set.length; i++) {
              const regex = regex_set[i];
              const regex_query = t.none(
                'insert into regex(regex_name, regex_pattern, agent_id) values($1,$2,$3)',
                [regex.name, regex.pattern, agent.agent_id]
              );
              regex_query_arr.push(regex_query);
            }
            return t.batch(regex_query_arr);
          })
          .then(() => {
            if (typeof synonyms_set === 'undefined') {
              return;
            }
            const synonym_query_arr = [];
            for (let i = 0; i < synonyms_set.length; i++) {
              const synonym = synonyms_set[i];
              const synonym_query = t.one(
                  'insert into synonyms(agent_id, synonym_reference) values($1, $2) ' +
                    'RETURNING synonym_id',
                  [agent.agent_id, synonym.value]
                )
                .then(synonym_inserted => {
                  const variant_query_arr = [];
                  const variants = synonym.synonyms;
                  for (let j = 0; j < variants.length; j++) {
                    const variants_query = t.none(
                        'insert into synonym_variant(synonym_value, synonym_id) ' +
                        'values ($1, $2)',
                      [variants[j], synonym_inserted.synonym_id]
                    );
                    variant_query_arr.push(variants_query);
                  }
                  return t.batch(variant_query_arr);
                });
              synonym_query_arr.push(synonym_query);
            }
            return t.batch(synonym_query_arr);
          });
      });
  })
    .then(() => {
      // success. All Data inserted.
      logger.winston.info(
        '----- All Data inserted. Sending response back --------'
      );
      return res.status(200).json({});
    })
    .catch(error => {
      // error should rollback delete entites as well
      logger.winston.info('Error occured. Rollbacking all: ' + error);
      return res.status(500).json({ Error: 'Error Occurred' });
    });
    */
}

