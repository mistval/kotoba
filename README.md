[![Discord Bots](https://discordbots.org/api/widget/251239170058616833.png)](https://discordbots.org/bot/251239170058616833)

# Kotoba

Kotoba is a project with several semi-independent pieces. Those are:

* [Kotoba Discord Bot](https://github.com/mistval/kotoba/tree/master/bot)
* [Kotobaweb.com frontend (React)](https://github.com/mistval/kotoba/tree/master/kotobaweb)
* [Kotobaweb API (Express)](https://github.com/mistval/kotoba/tree/master/api)

If you only care about the Discord bot you can stop reading now and go to [/bot](https://github.com/mistval/kotoba/tree/master/bot).

To deploy any of the projects independently, follow the instructions in their respective READMEs. To deploy them all together with Docker, follow the **Configuration** instructions in their respective READMEs and then run `docker-compose up` in this directory to build and deploy all projects in docker containers. Deploying on Linux is recommended however using Docker for Windows or Docker Toolbox should work on Windows. If using Docker Toolbox, you'll also need to use nginx for Windows or another proxy server application to proxy HTTP requests to the docker machine. You can also run the projects without using Docker (and should if you're doing development). Follow the instructions in the respective READMEs to do that.

In addition to the three main projects there are a few other directories:

* [/common](https://github.com/mistval/kotoba/tree/master/common) - Common code that is intended to be shared between node processes and browser.
* [/node-common](https://github.com/mistval/kotoba/tree/master/node-common) - Common code that is intended to be shared between node processes but not browser.
* [/nginx](https://github.com/mistval/kotoba/tree/master/nginx) - An nginx configuration for proxying HTTP requests to the **React frontend** and **API**.
