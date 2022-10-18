import fetch from 'node-fetch';
import base64 from "base-64";
import prompt from 'prompt';
import { format } from 'date-fns'

const properties = [
    {
      name: 'username',
      validator: /^[a-zA-Z\s-]+$/,
      warning: 'Username must be only letters, spaces, or dashes'
    },
    {
      name: 'password',
      hidden: true
    },
    {
      name: 'days',
      validator: /^0*(?:[1-9][0-9]?|100)$/,
      warning: 'Must be an integer between 1 and 100'
    }
  ];

  prompt.start();

  prompt.get(properties, function (err, result) {
    if (err) {
      return onErr(err);
    }

    const USERNAME = result.username;
    const PASSWORD = result.password;
    const DAYS = result.days;

    fetch('https://tools.skybet.net/jira/rest/api/2/search?os_authType=basic', {
    method: 'POST',
    body: JSON.stringify({
        "jql": `project = GSFE and resolutiondate > "-${DAYS}d"`,
        "startAt": 0,
        "maxResults": 150,
        "expand": ["changelog"],
        "fields": [
            "customfield_10103",
            "customfield_10005",
            "resolutiondate"
        ]
    }),
    headers: {
        'Authorization': 'Basic ' + base64.encode(USERNAME + ":" + PASSWORD),
        'Content-Type': 'application/json'
    },
})
    .then(response => response.json())
    .then(json => {
        const mappedItems = json.issues.map(issue => {
            const impOutDate = issue.changelog.histories.find(history => {
                return history.author.name === USERNAME && history.items.find(item => item.toString === 'Implementation Out')
            })

            const impInDate = issue.changelog.histories.find(history => {
              return history.author.name === USERNAME && history.items.find(item => item.toString === 'Implementation In')
          })

          const formattedImpOutDate = impOutDate ? format(new Date(impOutDate.created), 'MM/dd/yyyy') : null;
          const formattedImpInDate = impInDate ? format(new Date(impInDate.created), 'MM/dd/yyyy') : null;

            return {
                ticketId: issue.key,
                epicId: issue.fields.customfield_10103,
                resolvedAt: format(new Date(issue.fields.resolutiondate), 'MM/dd/yyyy'),
                impOutDate: formattedImpOutDate,
                impInDate: formattedImpInDate,
            }
        })
            .sort((a, b) => new Date(a.impOutDate) - new Date(b.impOutDate))
            .filter(item => item.impOutDate)

            console.table(mappedItems)
    })
  });
  
  function onErr(err) {
    console.log(err);
    return 1;
  }


