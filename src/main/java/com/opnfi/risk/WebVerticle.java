package com.opnfi.risk;

import com.opnfi.risk.model.TradingSessionStatus;
import io.vertx.core.AbstractVerticle;
import io.vertx.core.CompositeFuture;
import io.vertx.core.Future;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.Message;
import io.vertx.core.http.HttpServer;
import io.vertx.core.json.Json;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import io.vertx.ext.web.handler.BodyHandler;
import io.vertx.ext.web.handler.StaticHandler;

/**
 * Created by schojak on 19.8.16.
 */
public class WebVerticle extends AbstractVerticle {
    private static final Logger LOG = LoggerFactory.getLogger(WebVerticle.class);
    private static final Integer DEFAULT_HTTP_PORT = 8080;

    private HttpServer server;
    private EventBus eb;

    private TradingSessionStatus cacheTss = null;

    @Override
    public void start(Future<Void> startFuture) throws Exception {
        LOG.info("Starting {} with configuration: {}", WebVerticle.class.getSimpleName(), config().encodePrettily());
        eb = vertx.eventBus();

        CompositeFuture.all(startWebServer(), startCache()).setHandler(ar -> {
            if (ar.succeeded()) {
                startFuture.complete();
            } else {
                startFuture.fail(ar.cause());
            }
        });
    }

    private Future<HttpServer> startWebServer() {
        Future<HttpServer> webServerFuture = Future.future();
        Router router = Router.router(vertx);

        LOG.info("Adding route REST API");
        router.route("/api/v1.0/*").handler(BodyHandler.create());
        router.get("/api/v1.0/latest/tss").handler(this::latestTradingSessionStatus);
        router.get("/api/v1.0/latest/mc").handler(this::latestMarginComponent);
        router.get("/api/v1.0/latest/mc/:clearer").handler(this::latestMarginComponent);
        router.get("/api/v1.0/latest/mc/:clearer/:member").handler(this::latestMarginComponent);
        router.get("/api/v1.0/latest/mc/:clearer/:member/:account").handler(this::latestMarginComponent);
        router.get("/api/v1.0/latest/mc/:clearer/:member/:account/:clss").handler(this::latestMarginComponent);
        router.get("/api/v1.0/latest/mc/:clearer/:member/:account/:clss/:ccy").handler(this::latestMarginComponent);
        router.get("/api/v1.0/latest/tmr").handler(this::latestTotalMarginRequirement);
        router.get("/api/v1.0/latest/tmr/:clearer").handler(this::latestTotalMarginRequirement);
        router.get("/api/v1.0/latest/tmr/:clearer/:pool").handler(this::latestTotalMarginRequirement);
        router.get("/api/v1.0/latest/tmr/:clearer/:pool/:member").handler(this::latestTotalMarginRequirement);
        router.get("/api/v1.0/latest/tmr/:clearer/:pool/:member/:account").handler(this::latestTotalMarginRequirement);
        router.get("/api/v1.0/latest/tmr/:clearer/:pool/:member/:account/:ccy").handler(this::latestTotalMarginRequirement);
        router.get("/api/v1.0/latest/mss").handler(this::latestMarginShortfallSurplus);
        router.get("/api/v1.0/latest/mss/:clearer").handler(this::latestMarginShortfallSurplus);
        router.get("/api/v1.0/latest/mss/:clearer/:pool").handler(this::latestMarginShortfallSurplus);
        router.get("/api/v1.0/latest/mss/:clearer/:pool/:member").handler(this::latestMarginShortfallSurplus);
        router.get("/api/v1.0/latest/mss/:clearer/:pool/:member/:clearingCcy").handler(this::latestMarginShortfallSurplus);
        router.get("/api/v1.0/latest/mss/:clearer/:pool/:member/:clearingCcy/:ccy").handler(this::latestMarginShortfallSurplus);

        router.route("/*").handler(StaticHandler.create("webroot"));

        LOG.info("Starting web server on port {}", config().getInteger("httpPort", WebVerticle.DEFAULT_HTTP_PORT));
        server = vertx.createHttpServer()
                .requestHandler(router::accept)
                .listen(config().getInteger("httpPort", WebVerticle.DEFAULT_HTTP_PORT), webServerFuture.completer());
        return webServerFuture;
    }

    private Future<Void> startCache()
    {
        EventBus eb = vertx.eventBus();
        eb.consumer("ers.TradingSessionStatus", message -> cacheTradingSessionStatus(message));
        return Future.succeededFuture();
    }

    private void cacheTradingSessionStatus(Message msg) {
        LOG.trace("Caching TSS message with body: " + msg.body().toString());
        cacheTss = Json.decodeValue(msg.body().toString(), TradingSessionStatus.class);
    }

    private void latestTradingSessionStatus(RoutingContext routingContext) {
        LOG.trace("Received latest/tss request");

        eb.send("query.latestTradingSessionStatus", null, ar -> {
            if (ar.succeeded()) {
                LOG.trace("Received response to latest/tss request");

                routingContext.response()
                        .putHeader("content-type", "application/json; charset=utf-8")
                        .end((String)ar.result().body());
            }
            else
            {
                LOG.error("Failed to query the DB service", ar.cause());
            }
        });
    }

    private void latestMarginComponent(RoutingContext routingContext) {
        LOG.trace("Received latest/mc request");

        JsonObject params = new JsonObject();

        if (routingContext.request().getParam("clearer") != null && !"*".equals(routingContext.request().getParam("clearer")))
        {
            params.put("clearer", routingContext.request().getParam("clearer"));
        }

        if (routingContext.request().getParam("member") != null && !"*".equals(routingContext.request().getParam("member")))
        {
            params.put("member", routingContext.request().getParam("member"));
        }

        if (routingContext.request().getParam("account") != null && !"*".equals(routingContext.request().getParam("account")))
        {
            params.put("account", routingContext.request().getParam("account"));
        }

        if (routingContext.request().getParam("clss") != null && !"*".equals(routingContext.request().getParam("clss")))
        {
            params.put("clss", routingContext.request().getParam("clss"));
        }

        if (routingContext.request().getParam("ccy") != null && !"*".equals(routingContext.request().getParam("ccy")))
        {
            params.put("ccy", routingContext.request().getParam("ccy"));
        }

        eb.send("query.latestMarginComponent", params, ar -> {
            if (ar.succeeded()) {
                LOG.trace("Received response latest/mc request");

                routingContext.response()
                        .putHeader("content-type", "application/json; charset=utf-8")
                        .end((String)ar.result().body());
            }
            else
            {
                LOG.error("Failed to query the DB service", ar.cause());
            }
        });
    }

    private void latestTotalMarginRequirement(RoutingContext routingContext) {
        LOG.trace("Received latest/tmr request");

        JsonObject params = new JsonObject();

        if (routingContext.request().getParam("clearer") != null && !"*".equals(routingContext.request().getParam("clearer")))
        {
            params.put("clearer", routingContext.request().getParam("clearer"));
        }

        if (routingContext.request().getParam("pool") != null && !"*".equals(routingContext.request().getParam("pool")))
        {
            params.put("pool", routingContext.request().getParam("pool"));
        }

        if (routingContext.request().getParam("member") != null && !"*".equals(routingContext.request().getParam("member")))
        {
            params.put("member", routingContext.request().getParam("member"));
        }

        if (routingContext.request().getParam("account") != null && !"*".equals(routingContext.request().getParam("account")))
        {
            params.put("account", routingContext.request().getParam("account"));
        }

        if (routingContext.request().getParam("ccy") != null && !"*".equals(routingContext.request().getParam("ccy")))
        {
            params.put("ccy", routingContext.request().getParam("ccy"));
        }

        eb.send("query.latestTotalMarginRequirement", params, ar -> {
            if (ar.succeeded()) {
                LOG.trace("Received response latest/tmr request");

                routingContext.response()
                        .putHeader("content-type", "application/json; charset=utf-8")
                        .end((String)ar.result().body());
            }
            else
            {
                LOG.error("Failed to query the DB service", ar.cause());
            }
        });
    }

    private void latestMarginShortfallSurplus(RoutingContext routingContext) {
        LOG.trace("Received latest/mss request");

        JsonObject params = new JsonObject();

        if (routingContext.request().getParam("clearer") != null && !"*".equals(routingContext.request().getParam("clearer")))
        {
            params.put("clearer", routingContext.request().getParam("clearer"));
        }

        if (routingContext.request().getParam("pool") != null && !"*".equals(routingContext.request().getParam("pool")))
        {
            params.put("pool", routingContext.request().getParam("pool"));
        }

        if (routingContext.request().getParam("member") != null && !"*".equals(routingContext.request().getParam("member")))
        {
            params.put("member", routingContext.request().getParam("member"));
        }

        if (routingContext.request().getParam("clearingCcy") != null && !"*".equals(routingContext.request().getParam("clearingCcy")))
        {
            params.put("clearingCcy", routingContext.request().getParam("clearingCcy"));
        }

        if (routingContext.request().getParam("ccy") != null && !"*".equals(routingContext.request().getParam("ccy")))
        {
            params.put("ccy", routingContext.request().getParam("ccy"));
        }

        eb.send("query.latestMarginShortfallSurplus", params, ar -> {
            if (ar.succeeded()) {
                LOG.trace("Received response latest/mss request");

                routingContext.response()
                        .putHeader("content-type", "application/json; charset=utf-8")
                        .end((String)ar.result().body());
            }
            else
            {
                LOG.error("Failed to query the DB service", ar.cause());
            }
        });
    }

    @Override
    public void stop() throws Exception {
        LOG.info("Shutting down webserver");
        server.close();
    }
}
