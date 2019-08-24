const db = require('./db');
const logger = require('../util/logger');

function getSingleVariant(req, res, next) {
  logger.winston.info('variants.getSingleVariant');
  db.get('select * from synonym_variants where synonym_variant_id = ?', req.params.synonym_variant_id, function(err, data) {
    if (err) {
      logger.winston.info(err);
    } else {
      res.status(200).json(data);
    }
  });
}

function getSynonymVariants(req, res, next) {
  logger.winston.info('variants.getSynonymVariants');
  db.all('select * from synonym_variants where synonym_id = ?', req.params.synonym_id, function(err, data) {
    if (err) {
      logger.winston.info(err);
    } else {
      res.status(200).json(data);
    }
  });
}

function getSynonymsVariants(req, res, next) {
  logger.winston.info('variants.getSynonymVariants');
  const synonymsId = req.params.synonyms_id;
  db.all('select * from synonym_variants where synonym_id in (?)', synonymsId, function(err, data) {
    if (err) {
      logger.winston.info(err);
    } else {
      res.status(200).json(data);
    }
  });
}

function getAllSynonymVariants(req, res, next) {
  logger.winston.info('variants.getAllSynonymVariants');
  db.all("select synonym_reference as value, '[' || string_agg('\'' || synonym_value || '\'', ', ') || ']' as synonyms from entity_synonym_variants group by 1", function(err, data) {
    if (err) {
      logger.winston.info(err);
    } else {
      res.status(200).json(data);
    }
  });
}

function createVariant(req, res, next) {
  logger.winston.info('variants.createVariant');
  db.run('insert into synonym_variants (synonym_id, synonym_value)' + 'values (?, ?)', [req.body.synonym_id, req.body.synonym_value], function(err) {
    if (err) {
      logger.winston.info("Error inserting a new record");
    } else {
      db.get('SELECT last_insert_rowid()', function(err, data) {
        if (err) {
          res.status(500).json({ status: 'error', message: '' });
        } else {
          res.status(200).json({ status: 'success', message: 'Inserted', synonym_variant_id: data['last_insert_rowid()'] });
        }
      });
    }
  });
}

function removeVariant(req, res, next) {
  logger.winston.info('variants.removeVariant');
  db.run('delete from synonym_variants where synonym_variant_id = ?', req.params.synonym_variant_id, function(err) {
    if (err) {
      logger.winston.info("Error removing the record");
    } else {
      res.status(200).json({ status: 'success', message: 'Removed' });
    }
  });
}

function removeSynonymVariants(req, res, next) {
  logger.winston.info('variants.removeSynonymVariants');
  db.run('delete from synonym_variants where synonym_id = ?', req.params.synonym_id, function(err) {
    if (err) {
      logger.winston.info("Error removing the record");
    } else {
      res.status(200).json({ status: 'success', message: 'Removed' });
    }
  });
}

module.exports = {
  getSingleVariant,
  getSynonymVariants,
  createVariant,
  removeVariant,
  removeSynonymVariants,
  getSynonymsVariants,
  getAllSynonymVariants};
