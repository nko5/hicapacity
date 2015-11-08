# Todoist.com Slack.com integration

![Vote KO widget](http://f.cl.ly/items/1n3g0W0F0G3V0i0d0321/Screen%20Shot%202012-11-04%20at%2010.01.36%20AM.png)

![DoAllTheThings](http://www.puravidamultimedia.com/wp-content/uploads/2013/09/image.png)

## About

Enables a /todoist [slash command](https://api.slack.com/slash-commands) to get your Todo items over to your Inbox.

This was built over a few hours for [Node Knockout 2015](http://www.nodeknockout.com/). Please vote above!

## Howto

**Need to clean this up**

While we wait for an official integration, you'll need to manually complete
some steps on Slack and run some of this amazing-ness in the clouds.

1. Create a slash command integration on Slack
 - Tell slack the command name (/todoist - obvie)
 - Tell slack to use the POST method

Once configured, you'll be able to get your Todos over to [Todoist](https://todoist.com)

    /todoist Send organizers an email to send me our trophy! And some pie!

Will either:

- Send you back a message with a link to do the magic OAuth dance with Todoist

**OR**

- If you're already registered, adds a Todo in your Inbox over at Todoist

## Feedback

If you have feedback of any kind (you know, to tell us how awesome we are), we're easily found on the Twitters - [@mckayhdavis](https://twitter.com/mckayhdavis) [@ryankanno](https://twitter.com/ryankanno)

## Why did you write the code this way?

Because Internet. Also, because we're not actually Javascript developers. With
that said, we'd love to take pull requests from all you amazing people out
there.
