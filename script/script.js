'use strict';

const got = require('got');

module.exports = async function (activity) {
  try {
    const model = getObjPath(activity.Request, 'Data.model');

    model.items = [];

    switch (activity.Request.Path) {
    case 'input': {
      const body = {
        Keywords: model.input,
        SubjectId: '',
        LanguageId: 1,
        UserLevel: 0
      };

      const searchResponse = await got.post('https://zensardemo.level0help.com/api/v2/content/search', {
        json: true,
        body: body,
        auth: 'zensarapiuser@zensar.com:XXX'
      });

      if (searchResponse.body.length === 0) {
        model.answer = 'I\'m sorry, I did not understand. Please try a different term.';
        break;
      }

      const basicItems = searchResponse.body;
      const promises = [];

      for (let i = 0; i < basicItems.length; i++) {
        if (i > 4) break;

        const basicItem = basicItems[i];
        const promise = got(`https://zensardemo.level0help.com/api/v1/content/6/${basicItem.ContentId}/${basicItem.TaxonomyGuid}`, {
          json: true,
          auth: 'zensarapiuser@zensar.com:XXX'
        });

        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const items = [];

      for (let i = 0; i < results.length; i++) {
        const raw = results[i].body;
        const item = {
          title: raw.Name,
          description: raw.Description.replace(/<[^>]+>/g, ' '),
          link: raw.WebUrl,
          date: new Date(raw.DateCreated),
          video: raw.MultimediaUrl ? raw.MultimediaUrl : null,
          html: raw.Description
        };

        items.push(item);
      }

      model.items = items;
      break;
    }
    default: break;
    }

    activity.Response.Data = model;
  } catch (error) {
    let m = error.message;

    if (error.stack) m = m + ': ' + error.stack;

    activity.Response.ErrorCode = (error.response && error.response.statusCode) || 500;
    activity.Response.Data = {
      ErrorText: m
    };
  }
};

function getObjPath(obj, path) {
  if (!path) return obj;
  if (!obj) return null;

  const paths = path.split('.');
  let current = obj;

  for (let i = 0; i < paths.length; ++i) {
    if (current[paths[i]] === undefined) {
      return {};
    } else {
      current = current[paths[i]];
    }
  }

  return current;
}
