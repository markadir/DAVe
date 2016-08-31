package com.opnfi.risk;

import com.opnfi.risk.auth.ApiAuthHandler;
import com.opnfi.risk.restapi.ers.MarginComponentApi;
import com.opnfi.risk.restapi.ers.MarginShortfallSurplusApi;
import com.opnfi.risk.restapi.ers.PositionReportApi;
import com.opnfi.risk.restapi.ers.TotalMarginRequirementApi;
import com.opnfi.risk.restapi.ers.TradingSessionStatusApi;
import com.opnfi.risk.restapi.user.UserApi;
import io.vertx.core.AbstractVerticle;
import io.vertx.core.CompositeFuture;
import io.vertx.core.Future;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.http.ClientAuth;
import io.vertx.core.http.HttpMethod;
import io.vertx.core.http.HttpServer;
import io.vertx.core.http.HttpServerOptions;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.core.net.JksOptions;
import io.vertx.ext.auth.AuthProvider;
import io.vertx.ext.auth.mongo.HashSaltStyle;
import io.vertx.ext.auth.mongo.MongoAuth;
import io.vertx.ext.mongo.MongoClient;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.BodyHandler;
import io.vertx.ext.web.handler.CorsHandler;
import io.vertx.ext.web.handler.CookieHandler;
import io.vertx.ext.web.handler.SessionHandler;
import io.vertx.ext.web.handler.StaticHandler;
import io.vertx.ext.web.handler.UserSessionHandler;
import io.vertx.ext.web.sstore.LocalSessionStore;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by schojak on 19.8.16.
 */
public class WebVerticle extends AbstractVerticle {
    private static final Logger LOG = LoggerFactory.getLogger(WebVerticle.class);

    private static final Integer DEFAULT_HTTP_PORT = 8080;

    private static final Boolean DEFAULT_SSL = false;
    private static final Boolean DEFAULT_SSL_REQUIRE_CLIENT_AUTH = false;

    private static final Boolean DEFAULT_CORS = false;
    private static final String DEFAULT_CORS_ORIGIN = "*";

    private static final Boolean DEFAULT_COMPRESSION = true;

    private static final Boolean DEFAULT_AUTH_ENABLED = false;
    private static final String DEFAULT_AUTH_DB_NAME = "OpnFi-Risk";
    private static final String DEFAULT_AUTH_CONNECTION_STRING = "mongodb://localhost:27017";
    private static final String DEFAULT_SALT = "OpnFiRisk";

    private HttpServer server;
    private EventBus eb;

    @Override
    public void start(Future<Void> startFuture) throws Exception {
        LOG.info("Starting {} with configuration: {}", WebVerticle.class.getSimpleName(), config().encodePrettily());
        eb = vertx.eventBus();

        List<Future> futures = new ArrayList<>();
        futures.add(startWebServer());

        CompositeFuture.all(futures).setHandler(ar -> {
            if (ar.succeeded()) {
                startFuture.complete();
            } else {
                startFuture.fail(ar.cause());
            }
        });
    }

    private AuthProvider createAuthenticationProvider() {
        JsonObject config = new JsonObject();
        LOG.info("Auth config: {}", config().getJsonObject("auth").encodePrettily());
        config.put("db_name", config()
                .getJsonObject("auth")
                .getString("db_name", WebVerticle.DEFAULT_AUTH_DB_NAME));
        config.put("useObjectId", true);
        config.put("connection_string", config()
                .getJsonObject("auth")
                .getString("connection_string", WebVerticle.DEFAULT_AUTH_CONNECTION_STRING));
        MongoClient client = MongoClient.createShared(vertx, config);

        JsonObject authProperties = new JsonObject();
        MongoAuth authProvider = MongoAuth.create(client, authProperties);
        authProvider.getHashStrategy().setSaltStyle(HashSaltStyle.EXTERNAL);
        authProvider.getHashStrategy().setExternalSalt(config().getJsonObject("auth").getString("salt", WebVerticle.DEFAULT_SALT));
        return authProvider;
    }

    private Future<HttpServer> startWebServer() {
        Future<HttpServer> webServerFuture = Future.future();
        Router router = Router.router(vertx);

        if (config().getJsonObject("CORS", new JsonObject()).getBoolean("enable", WebVerticle.DEFAULT_CORS)) {
            LOG.info("Enabling CORS handler");

            //Wildcard(*) not allowed if allowCredentials is true
            CorsHandler corsHandler = CorsHandler.create(config().getJsonObject("CORS", new JsonObject()).getString("origin", WebVerticle.DEFAULT_CORS_ORIGIN));
            corsHandler.allowCredentials(true);
            corsHandler.allowedMethod(HttpMethod.OPTIONS);
            corsHandler.allowedMethod(HttpMethod.GET);
            corsHandler.allowedMethod(HttpMethod.POST);
            corsHandler.allowedMethod(HttpMethod.DELETE);
            corsHandler.allowedHeader("Authorization");
            corsHandler.allowedHeader("www-authenticate");
            corsHandler.allowedHeader("Content-Type");

            router.route().handler(corsHandler);
        }

        UserApi userApi;

        if (config().getJsonObject("auth", new JsonObject()).getBoolean("enable", WebVerticle.DEFAULT_AUTH_ENABLED)) {
            LOG.info("Enabling authentication");

            AuthProvider authenticationProvider = this.createAuthenticationProvider();

            router.route().handler(CookieHandler.create());
            router.route().handler(BodyHandler.create());
            router.route().handler(SessionHandler.create(LocalSessionStore.create(vertx)));
            router.route().handler(UserSessionHandler.create(authenticationProvider));
            router.routeWithRegex("^/api/v1.0/(?!user/login).*$").handler(ApiAuthHandler.create(authenticationProvider));

            userApi = new UserApi(authenticationProvider);
        }
        else
        {
            userApi = new UserApi(null);
        }

        TradingSessionStatusApi tssApi = new TradingSessionStatusApi(eb);
        MarginComponentApi mcApi = new MarginComponentApi(eb);
        TotalMarginRequirementApi tmrApi = new TotalMarginRequirementApi(eb);
        MarginShortfallSurplusApi mssApi = new MarginShortfallSurplusApi(eb);
        PositionReportApi prApi = new PositionReportApi(eb);

        LOG.info("Adding route REST API");
        router.route("/api/v1.0/*").handler(BodyHandler.create());
        router.post("/api/v1.0/user/login").handler(userApi::login);
        router.get("/api/v1.0/user/logout").handler(userApi::logout);
        router.get("/api/v1.0/user/loginStatus").handler(userApi::loginStatus);
        router.get("/api/v1.0/latest/tss").handler(tssApi::latestCall);
        router.get("/api/v1.0/history/tss").handler(tssApi::historyCall);
        router.get("/api/v1.0/latest/mc").handler(mcApi::latestCall);
        router.get("/api/v1.0/latest/mc/:clearer").handler(mcApi::latestCall);
        router.get("/api/v1.0/latest/mc/:clearer/:member").handler(mcApi::latestCall);
        router.get("/api/v1.0/latest/mc/:clearer/:member/:account").handler(mcApi::latestCall);
        router.get("/api/v1.0/latest/mc/:clearer/:member/:account/:clss").handler(mcApi::latestCall);
        router.get("/api/v1.0/latest/mc/:clearer/:member/:account/:clss/:ccy").handler(mcApi::latestCall);
        router.get("/api/v1.0/history/mc/:clearer").handler(mcApi::historyCall);
        router.get("/api/v1.0/history/mc/:clearer/:member").handler(mcApi::historyCall);
        router.get("/api/v1.0/history/mc/:clearer/:member/:account").handler(mcApi::historyCall);
        router.get("/api/v1.0/history/mc/:clearer/:member/:account/:clss").handler(mcApi::historyCall);
        router.get("/api/v1.0/history/mc/:clearer/:member/:account/:clss/:ccy").handler(mcApi::historyCall);
        router.get("/api/v1.0/latest/tmr").handler(tmrApi::latestCall);
        router.get("/api/v1.0/latest/tmr/:clearer").handler(tmrApi::latestCall);
        router.get("/api/v1.0/latest/tmr/:clearer/:pool").handler(tmrApi::latestCall);
        router.get("/api/v1.0/latest/tmr/:clearer/:pool/:member").handler(tmrApi::latestCall);
        router.get("/api/v1.0/latest/tmr/:clearer/:pool/:member/:account").handler(tmrApi::latestCall);
        router.get("/api/v1.0/latest/tmr/:clearer/:pool/:member/:account/:ccy").handler(tmrApi::latestCall);
        router.get("/api/v1.0/history/tmr/:clearer").handler(tmrApi::historyCall);
        router.get("/api/v1.0/history/tmr/:clearer/:pool").handler(tmrApi::historyCall);
        router.get("/api/v1.0/history/tmr/:clearer/:pool/:member").handler(tmrApi::historyCall);
        router.get("/api/v1.0/history/tmr/:clearer/:pool/:member/:account").handler(tmrApi::historyCall);
        router.get("/api/v1.0/history/tmr/:clearer/:pool/:member/:account/:ccy").handler(tmrApi::historyCall);
        router.get("/api/v1.0/latest/mss").handler(mssApi::latestCall);
        router.get("/api/v1.0/latest/mss/:clearer").handler(mssApi::latestCall);
        router.get("/api/v1.0/latest/mss/:clearer/:pool").handler(mssApi::latestCall);
        router.get("/api/v1.0/latest/mss/:clearer/:pool/:member").handler(mssApi::latestCall);
        router.get("/api/v1.0/latest/mss/:clearer/:pool/:member/:clearingCcy").handler(mssApi::latestCall);
        router.get("/api/v1.0/latest/mss/:clearer/:pool/:member/:clearingCcy/:ccy").handler(mssApi::latestCall);
        router.get("/api/v1.0/history/mss/:clearer").handler(mssApi::historyCall);
        router.get("/api/v1.0/history/mss/:clearer/:pool").handler(mssApi::historyCall);
        router.get("/api/v1.0/history/mss/:clearer/:pool/:member").handler(mssApi::historyCall);
        router.get("/api/v1.0/history/mss/:clearer/:pool/:member/:clearingCcy").handler(mssApi::historyCall);
        router.get("/api/v1.0/history/mss/:clearer/:pool/:member/:clearingCcy/:ccy").handler(mssApi::historyCall);
        router.get("/api/v1.0/latest/pr").handler(prApi::latestCall);
        router.get("/api/v1.0/latest/pr/:clearer").handler(prApi::latestCall);
        router.get("/api/v1.0/latest/pr/:clearer/:member").handler(prApi::latestCall);
        router.get("/api/v1.0/latest/pr/:clearer/:member/:account").handler(prApi::latestCall);
        router.get("/api/v1.0/latest/pr/:clearer/:member/:account/:symbol").handler(prApi::latestCall);
        router.get("/api/v1.0/latest/pr/:clearer/:member/:account/:symbol/:putCall").handler(prApi::latestCall);
        router.get("/api/v1.0/latest/pr/:clearer/:member/:account/:symbol/:putCall/:strikePrice").handler(prApi::latestCall);
        router.get("/api/v1.0/latest/pr/:clearer/:member/:account/:symbol/:putCall/:strikePrice/:optAttribute").handler(prApi::latestCall);
        router.get("/api/v1.0/latest/pr/:clearer/:member/:account/:symbol/:putCall/:strikePrice/:optAttribute/:maturityMonthYear").handler(prApi::latestCall);
        router.get("/api/v1.0/history/pr").handler(prApi::historyCall);
        router.get("/api/v1.0/history/pr/:clearer").handler(prApi::historyCall);
        router.get("/api/v1.0/history/pr/:clearer/:member").handler(prApi::historyCall);
        router.get("/api/v1.0/history/pr/:clearer/:member/:account").handler(prApi::historyCall);
        router.get("/api/v1.0/history/pr/:clearer/:member/:account/:symbol").handler(prApi::historyCall);
        router.get("/api/v1.0/history/pr/:clearer/:member/:account/:symbol/:putCall").handler(prApi::historyCall);
        router.get("/api/v1.0/history/pr/:clearer/:member/:account/:symbol/:putCall/:strikePrice").handler(prApi::historyCall);
        router.get("/api/v1.0/history/pr/:clearer/:member/:account/:symbol/:putCall/:strikePrice/:optAttribute").handler(prApi::historyCall);
        router.get("/api/v1.0/history/pr/:clearer/:member/:account/:symbol/:putCall/:strikePrice/:optAttribute/:maturityMonthYear").handler(prApi::historyCall);

        router.route("/*").handler(StaticHandler.create("webroot"));

        LOG.info("Starting web server on port {}", config().getInteger("httpPort", WebVerticle.DEFAULT_HTTP_PORT));

        HttpServerOptions httpOptions = new HttpServerOptions();

        if (config().getJsonObject("ssl", new JsonObject()).getBoolean("enable", DEFAULT_SSL) && config().getJsonObject("ssl", new JsonObject()).getString("keystore") != null && config().getJsonObject("ssl", new JsonObject()).getString("keystorePassword") != null)
        {
            LOG.info("Enabling SSL on webserver");
            httpOptions.setSsl(true).setKeyStoreOptions(new JksOptions().setPassword(config().getJsonObject("ssl").getString("keystorePassword")).setPath(config().getJsonObject("ssl").getString("keystore")));

            if (config().getJsonObject("ssl", new JsonObject()).getString("truststore") != null && config().getJsonObject("ssl", new JsonObject()).getString("truststorePassword") != null)
            {
                LOG.info("Enabling SSL Client Authentication on webserver");
                httpOptions.setTrustStoreOptions(new JksOptions().setPassword(config().getJsonObject("ssl").getString("truststorePassword")).setPath(config().getJsonObject("ssl").getString("truststore")));

                if (config().getJsonObject("ssl").getBoolean("requireTLSClientAuth", DEFAULT_SSL_REQUIRE_CLIENT_AUTH))
                {
                    LOG.info("Setting SSL Client Authentication as required");
                    httpOptions.setClientAuth(ClientAuth.REQUIRED);
                }
                else
                {
                    httpOptions.setClientAuth(ClientAuth.REQUEST);
                }
            }
        }

        if (config().getBoolean("compression", DEFAULT_COMPRESSION))
        {
            LOG.info("Enabling compression on webserver");
            httpOptions.setCompressionSupported(config().getBoolean("compression", DEFAULT_COMPRESSION));
        }

        server = vertx.createHttpServer(httpOptions)
                .requestHandler(router::accept)
                .listen(config().getInteger("httpPort", WebVerticle.DEFAULT_HTTP_PORT), webServerFuture.completer());
        return webServerFuture;
    }

    @Override
    public void stop() throws Exception {
        LOG.info("Shutting down webserver");
        server.close();
    }
}
