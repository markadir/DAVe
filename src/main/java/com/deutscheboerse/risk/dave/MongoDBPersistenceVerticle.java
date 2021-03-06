package com.deutscheboerse.risk.dave;

import com.deutscheboerse.risk.dave.ers.model.*;
import io.vertx.core.*;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.Message;
import io.vertx.core.json.Json;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.ext.mongo.MongoClient;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Function;

/**
 * Created by schojak on 19.8.16.
 */
public class MongoDBPersistenceVerticle extends AbstractVerticle {
    final static private Logger LOG = LoggerFactory.getLogger(MongoDBPersistenceVerticle.class);

    private static final String DEFAULT_DB_NAME = "DAVe";
    private static final String DEFAULT_CONNECTION_STRING = "mongodb://localhost:27017";

    private MongoClient mongo;

    @Override
    public void start(Future<Void> fut) throws Exception {
        LOG.info("Starting {} with configuration: {}", MongoDBPersistenceVerticle.class.getSimpleName(), config().encodePrettily());

        Future<Void> chainFuture = Future.future();
        connectDb()
                .compose(this::initDb)
                .compose(this::startStoreHandlers)
                .compose(this::startQueryHandlers)
                .compose(chainFuture::complete, chainFuture);
        chainFuture.setHandler(ar -> {
            if (ar.succeeded()) {
                LOG.info("MongoDB verticle started");
                fut.complete();
            } else {
                LOG.error("MongoDB verticle failed to deploy", chainFuture.cause());
                fut.fail(chainFuture.cause());
            }
        });
    }

    private Future<Void> connectDb() {
        JsonObject config = new JsonObject();
        config.put("db_name", config().getString("db_name", MongoDBPersistenceVerticle.DEFAULT_DB_NAME));
        config.put("useObjectId", true);
        config.put("connection_string", config().getString("connection_string", MongoDBPersistenceVerticle.DEFAULT_CONNECTION_STRING));

        mongo = MongoClient.createShared(vertx, config);
        LOG.info("Connected to MongoDB");
        return Future.succeededFuture();
    }

    private Future<Void> initDb(Void unused) {
        Future<Void> initDbFuture = Future.future();
        mongo.getCollections(res -> {
            if (res.succeeded()) {
                List<String> mongoCollections = res.result();
                List<String> neededCollections = new ArrayList<>(Arrays.asList(
                        "ers.TradingSessionStatus",
                        "ers.MarginComponent",
                        "ers.TotalMarginRequirement",
                        "ers.MarginShortfallSurplus",
                        "ers.PositionReport",
                        "ers.RiskLimit"
                ));

                List<Future> futs = new ArrayList<>();

                neededCollections.stream()
                        .filter(collection -> ! mongoCollections.contains(collection))
                        .forEach(collection -> {
                            LOG.info("Collection {} is missing and will be added", collection);
                            Future<Void> fut = Future.future();
                            mongo.createCollection(collection, fut.completer());
                            futs.add(fut);
                        });

                CompositeFuture.all(futs).setHandler(ar -> {
                    if (ar.succeeded())
                    {
                        LOG.info("Mongo has all needed collections for ERS");
                        LOG.info("Initialized MongoDB");
                        initDbFuture.complete();
                    }
                    else
                    {
                        LOG.error("Failed to add all collections needed for ERS to Mongo", ar.cause());
                        initDbFuture.fail(ar.cause());
                    }
                });
            } else {
                LOG.error("Failed to get collection list", res.cause());
                initDbFuture.fail(res.cause());
            }
        });
        return initDbFuture;
    }

    private Future<Void> startStoreHandlers(Void unused)
    {
        EventBus eb = vertx.eventBus();

        // Camel consumers
        eb.consumer("ers.TradingSessionStatus", message -> store(message));
        eb.consumer("ers.MarginComponent", message -> store(message));
        eb.consumer("ers.TotalMarginRequirement", message -> store(message));
        eb.consumer("ers.MarginShortfallSurplus", message -> store(message));
        eb.consumer("ers.PositionReport", message -> store(message));
        eb.consumer("ers.RiskLimit", message -> store(message));

        LOG.info("Event bus store handlers subscribed");
        return Future.succeededFuture();
    }

    private Future<Void> startQueryHandlers(Void unused)
    {
        EventBus eb = vertx.eventBus();

        // Query endpoints
        eb.consumer("query.latestTradingSessionStatus", message -> query(message, TradingSessionStatusModel::getLatestCommand));
        eb.consumer("query.historyTradingSessionStatus", message -> query(message, TradingSessionStatusModel::getHistoryCommand));
        eb.consumer("query.latestMarginComponent", message -> query(message, MarginComponentModel::getLatestCommand));
        eb.consumer("query.historyMarginComponent", message -> query(message, MarginComponentModel::getHistoryCommand));
        eb.consumer("query.latestTotalMarginRequirement", message -> query(message, TotalMarginRequirementModel::getLatestCommand));
        eb.consumer("query.historyTotalMarginRequirement", message -> query(message, TotalMarginRequirementModel::getHistoryCommand));
        eb.consumer("query.latestMarginShortfallSurplus", message -> query(message, MarginShortfallSurplusModel::getLatestCommand));
        eb.consumer("query.historyMarginShortfallSurplus", message -> query(message, MarginShortfallSurplusModel::getHistoryCommand));
        eb.consumer("query.latestPositionReport", message -> query(message, PositionReportModel::getLatestCommand));
        eb.consumer("query.historyPositionReport", message -> query(message, PositionReportModel::getHistoryCommand));
        eb.consumer("query.latestRiskLimit", message -> query(message, RiskLimitModel::getLatestCommand));
        eb.consumer("query.historyRiskLimit", message -> query(message, RiskLimitModel::getHistoryCommand));

        LOG.info("Event bus query handlers subscribed");
        return Future.succeededFuture();
    }

    private void query(Message msg, Function<JsonObject, JsonObject> commandFnc)
    {
        LOG.trace("Received {} query with message {}", msg.address(), msg.body());

        JsonObject params = (JsonObject)msg.body();

        mongo.runCommand("aggregate", commandFnc.apply(params), res -> {
            if (res.succeeded()) {
                msg.reply(Json.encodePrettily(res.result().getJsonArray("result")));
            } else {
                LOG.error("{} query failed", msg.address(), res.cause());
            }
        });
    }

    private void store(Message msg)
    {
        LOG.trace("Storing message {} with body {}", msg.address(), msg.body().toString());
        JsonObject json = (JsonObject)msg.body();

        mongo.insert(msg.address(), json, res -> {
            if (res.succeeded())
            {
                LOG.trace("Stored {} into DB", msg.address());
                msg.reply(new JsonObject());
            }
            else
            {
                LOG.error("Failed to store {} into DB ", msg.address(), res.cause());
                msg.fail(1, res.cause().getMessage());
            }
        });
    }

    @Override
    public void stop() throws Exception {
        LOG.info("MongoDBPersistenceVerticle is being stopped");
        mongo.close();
    }
}
