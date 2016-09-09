package com.opnfi.risk;

import com.opnfi.risk.utils.DummyData;
import io.vertx.core.DeploymentOptions;
import io.vertx.core.Vertx;
import io.vertx.core.json.Json;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.mongo.MongoClient;
import io.vertx.ext.unit.Async;
import io.vertx.ext.unit.TestContext;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;

import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(VertxUnitRunner.class)
public class MongoDBPersistenceVerticleIT {
    private final DateFormat timestampFormatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
    private final DateFormat dateFormatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX");
    private final DateFormat mongoTimestampFormatter;
    {
        mongoTimestampFormatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
        mongoTimestampFormatter.setTimeZone(TimeZone.getTimeZone("UTC"));
    }

    private final DateFormat mongoDateFormatter;
    {
        mongoDateFormatter = new SimpleDateFormat("yyyy-MM-dd");
        mongoDateFormatter.setTimeZone(TimeZone.getTimeZone("UTC"));
    }

    private final static List<String> fields;
    static {
        fields = new ArrayList<>();
        fields.add("reqId");
        fields.add("sesId");
        fields.add("stat");
        fields.add("statRejRsn");
        fields.add("txt");
        //fields.add("received");
        fields.add("clearer");
        fields.add("member");
        fields.add("account");
        fields.add("clss");
        fields.add("ccy");
        //fields.add("txnTm");
        //fields.add("bizDt");
        fields.add("rptId");
        fields.add("variationMargin");
        fields.add("premiumMargin");
        fields.add("liquiMargin");
        fields.add("spreadMargin");
        fields.add("additionalMargin");
        fields.add("lastReportRequested");
        fields.add("symbol");
        fields.add("putCall");
        fields.add("maturityMonthYear");
        fields.add("strikePrice");
        fields.add("optAttribute");
        fields.add("crossMarginLongQty");
        fields.add("crossMarginShortQty");
        fields.add("optionExcerciseQty");
        fields.add("optionAssignmentQty");
        fields.add("allocationTradeQty");
        fields.add("deliveryNoticeQty");
        fields.add("pool");
        fields.add("unadjustedMargin");
        fields.add("adjustedMargin");
        fields.add("poolType");
        fields.add("clearingCcy");
        fields.add("marginRequirement");
        fields.add("securityCollateral");
        fields.add("cashBalance");
        fields.add("shortfallSurplus");
        fields.add("marginCall");
        fields.add("reqRslt");
        fields.add("txt");
        fields.add("limitType");
        fields.add("utilization");
        fields.add("warningLevel");
        fields.add("throttleLevel");
        fields.add("rejectLevel");
    }

    //private final DateFormat dateFormatter = new SimpleDateFormat("yyyy-MM-dd");
    private static Vertx vertx;
    private static MongoClient mongoClient;

    @BeforeClass
    public static void setUp(TestContext context) {
        MongoDBPersistenceVerticleIT.vertx = Vertx.vertx();
        JsonObject config = new JsonObject();
        config.put("db_name", "OpnFi-Risk-Test" + UUID.randomUUID().getLeastSignificantBits());
        config.put("connection_string", "mongodb://localhost:" + System.getProperty("mongodb.port", "27017"));
        DeploymentOptions options = new DeploymentOptions().setConfig(config);
        MongoDBPersistenceVerticleIT.vertx.deployVerticle(MongoDBPersistenceVerticle.class.getName(), options, context.asyncAssertSuccess());
        MongoDBPersistenceVerticleIT.mongoClient = MongoClient.createShared(MongoDBPersistenceVerticleIT.vertx, config);
    }

    private JsonObject transformDummyData(JsonObject data) throws ParseException {
        /*System.out.println(Json.encodePrettily(data));

        if (data.containsKey("received")) {
            System.out.println(Json.encodePrettily(data.getJsonObject("received")));

            data.put("received", patchTimestamp(data.getJsonObject("received")));
        }

        if (data.containsKey("txnTm")) {
            System.out.println(Json.encodePrettily(data.getJsonObject("txnTm")));
            data.put("txnTm", patchTimestamp(data.getJsonObject("txnTm")));
        }

        if (data.containsKey("bizDt")) {
            data.put("bizDt", patchDate(data.getJsonObject("bizDt")));
        }*/

        return data;
    }

    private String patchTimestamp(JsonObject date) throws ParseException {
        System.out.println(date.getString("$date"));
        return mongoTimestampFormatter.format(timestampFormatter.parse(date.getString("$date")));
    }

    private String patchDate(JsonObject date) throws ParseException {
        return mongoDateFormatter.format(dateFormatter.parse(date.getString("$date")));
    }

    private JsonObject transformQueryResult(JsonObject data)
    {
        /*if (data.containsKey("_id")) {
            data.remove("_id");
        }

        if (data.containsKey("id")) {
            data.remove("id");
        }*/

        return data;
    }

    private void compareMessages(TestContext context, JsonObject expected, JsonObject actual) throws ParseException {
        JsonObject transformedExpected = transformDummyData(expected.copy());
        JsonObject transformedActual = transformQueryResult(actual.copy());

        fields.forEach(key -> {
            if (transformedActual.containsKey(key))
            {
                context.assertEquals(transformedExpected.getValue(key), transformedActual.getValue(key), key + " are not equal in " + Json.encodePrettily(transformedExpected) + " versus " + Json.encodePrettily(transformedActual));
            }
        });
    }


    @Test
    public void checkCollectionsExist(TestContext context) {
        List<String> requiredCollections = new ArrayList<>();
        requiredCollections.add("ers.TradingSessionStatus");
        requiredCollections.add("ers.MarginComponent");
        requiredCollections.add("ers.TotalMarginRequirement");
        requiredCollections.add("ers.MarginShortfallSurplus");
        requiredCollections.add("ers.PositionReport");
        requiredCollections.add("ers.RiskLimit");
        final Async async = context.async();
        MongoDBPersistenceVerticleIT.mongoClient.getCollections(ar -> {
            if (ar.succeeded()) {
                if (ar.result().containsAll(requiredCollections)) {
                    async.complete();
                } else {
                    requiredCollections.removeAll(ar.result());
                    context.fail("Following collections were not created: " + requiredCollections);
                }
            } else {
                context.fail(ar.cause());
            }
        });
    }

    @Test
    public void testTradingSessionStatus(TestContext context) throws InterruptedException {
        // Feed the data into the store
        DummyData.tradingSessionStatusJson.forEach(tss -> {
            vertx.eventBus().publish("ers.TradingSessionStatus", tss);
        });

        // Test the latest query
        final Async asyncLatest = context.async();
        vertx.eventBus().send("query.latestTradingSessionStatus", new JsonObject(), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonObject response = new JsonObject((String) ar.result().body());

                    compareMessages(context, DummyData.tradingSessionStatusJson.get(1), response);
                    asyncLatest.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.latestTradingSessionStatus!");
            }
        });

        // Test the latest query
        final Async asyncHistory = context.async();
        vertx.eventBus().send("query.historyTradingSessionStatus", new JsonObject(), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(2, response.size());
                    compareMessages(context, DummyData.tradingSessionStatusJson.get(0), response.getJsonObject(0));
                    compareMessages(context, DummyData.tradingSessionStatusJson.get(1), response.getJsonObject(1));
                    asyncHistory.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.historyTradingSessionStatus!");
            }
        });
    }

    @Test
    public void testPositionReport(TestContext context) throws InterruptedException {
        // Feed the data into the store
        DummyData.positionReportJson.forEach(pr -> {
            vertx.eventBus().publish("ers.PositionReport", pr);
        });

        // Test the latest query
        final Async asyncLatest = context.async();
        vertx.eventBus().send("query.latestPositionReport", new JsonObject(), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(2, response.size());

                    compareMessages(context, DummyData.positionReportJson.get(2), response.getJsonObject(1));
                    compareMessages(context, DummyData.positionReportJson.get(3), response.getJsonObject(0));
                    asyncLatest.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.latestPositionReport!");
            }
        });

        // Test the latest query with filter
        final Async asyncLatestFilter = context.async();
        vertx.eventBus().send("query.latestPositionReport", new JsonObject().put("clearer", "ABCFR").put("member", "ABCFR"), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(1, response.size());

                    compareMessages(context, DummyData.positionReportJson.get(3), response.getJsonObject(0));
                    asyncLatestFilter.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.latestPositionReport!");
            }
        });

        // Test the history query
        final Async asyncHistory = context.async();
        vertx.eventBus().send("query.historyPositionReport", new JsonObject(), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(4, response.size());

                    compareMessages(context, DummyData.positionReportJson.get(0), response.getJsonObject(0));
                    compareMessages(context, DummyData.positionReportJson.get(1), response.getJsonObject(1));
                    compareMessages(context, DummyData.positionReportJson.get(2), response.getJsonObject(2));
                    compareMessages(context, DummyData.positionReportJson.get(3), response.getJsonObject(3));
                    asyncHistory.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.historyPositionReport!");
            }
        });

        // Test the history query with filter
        final Async asyncHistoryFilter = context.async();
        vertx.eventBus().send("query.historyPositionReport", new JsonObject().put("clearer", "ABCFR").put("member", "ABCFR"), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(2, response.size());

                    compareMessages(context, DummyData.positionReportJson.get(1), response.getJsonObject(0));
                    compareMessages(context, DummyData.positionReportJson.get(3), response.getJsonObject(1));
                    asyncHistoryFilter.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.historyPositionReport!");
            }
        });
    }

    @Test
    public void testMarginComponent(TestContext context) throws InterruptedException {
        // Feed the data into the store
        DummyData.marginComponentJson.forEach(mc -> {
            vertx.eventBus().publish("ers.MarginComponent", mc);
        });

        // Test the latest query
        final Async asyncLatest = context.async();
        vertx.eventBus().send("query.latestMarginComponent", new JsonObject(), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(2, response.size());

                    compareMessages(context, DummyData.marginComponentJson.get(2), response.getJsonObject(1));
                    compareMessages(context, DummyData.marginComponentJson.get(3), response.getJsonObject(0));
                    asyncLatest.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.latestMarginComponent!");
            }
        });

        // Test the latest query with filter
        final Async asyncLatestFilter = context.async();
        vertx.eventBus().send("query.latestMarginComponent", new JsonObject().put("clearer", "ABCFR").put("member", "DEFFR"), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(1, response.size());

                    compareMessages(context, DummyData.marginComponentJson.get(2), response.getJsonObject(0));
                    asyncLatestFilter.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.latestMarginComponent!");
            }
        });

        // Test the history query
        final Async asyncHistory = context.async();
        vertx.eventBus().send("query.historyMarginComponent", new JsonObject(), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(4, response.size());

                    compareMessages(context, DummyData.marginComponentJson.get(0), response.getJsonObject(0));
                    compareMessages(context, DummyData.marginComponentJson.get(1), response.getJsonObject(1));
                    compareMessages(context, DummyData.marginComponentJson.get(2), response.getJsonObject(2));
                    compareMessages(context, DummyData.marginComponentJson.get(3), response.getJsonObject(3));
                    asyncHistory.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.historyMarginComponent!");
            }
        });

        // Test the history query with filter
        final Async asyncHistoryFilter = context.async();
        vertx.eventBus().send("query.historyMarginComponent", new JsonObject().put("clearer", "ABCFR").put("member", "DEFFR"), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(2, response.size());

                    compareMessages(context, DummyData.marginComponentJson.get(0), response.getJsonObject(0));
                    compareMessages(context, DummyData.marginComponentJson.get(2), response.getJsonObject(1));
                    asyncHistoryFilter.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.historyMarginComponent!");
            }
        });
    }


    @Test
    public void testTotalMarginRequirement(TestContext context) throws InterruptedException {
        // Feed the data into the store
        DummyData.totalMarginRequirementJson.forEach(tmr -> {
            vertx.eventBus().publish("ers.TotalMarginRequirement", tmr);
        });

        // Test the latest query
        final Async asyncLatest = context.async();
        vertx.eventBus().send("query.latestTotalMarginRequirement", new JsonObject(), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(2, response.size());

                    compareMessages(context, DummyData.totalMarginRequirementJson.get(2), response.getJsonObject(1));
                    compareMessages(context, DummyData.totalMarginRequirementJson.get(3), response.getJsonObject(0));
                    asyncLatest.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.latestTotalMarginRequirement!");
            }
        });

        // Test the latest query with filter
        final Async asyncLatestFilter = context.async();
        vertx.eventBus().send("query.latestTotalMarginRequirement", new JsonObject().put("clearer", "ABCFR").put("member", "DEFFR"), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(1, response.size());

                    compareMessages(context, DummyData.totalMarginRequirementJson.get(2), response.getJsonObject(0));
                    asyncLatestFilter.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.latestTotalMarginRequirement!");
            }
        });

        // Test the history query
        final Async asyncHistory = context.async();
        vertx.eventBus().send("query.historyTotalMarginRequirement", new JsonObject(), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(4, response.size());

                    compareMessages(context, DummyData.totalMarginRequirementJson.get(0), response.getJsonObject(0));
                    compareMessages(context, DummyData.totalMarginRequirementJson.get(1), response.getJsonObject(1));
                    compareMessages(context, DummyData.totalMarginRequirementJson.get(2), response.getJsonObject(2));
                    compareMessages(context, DummyData.totalMarginRequirementJson.get(3), response.getJsonObject(3));
                    asyncHistory.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.historyTotalMarginRequirement!");
            }
        });

        // Test the history query with filter
        final Async asyncHistoryFilter = context.async();
        vertx.eventBus().send("query.historyTotalMarginRequirement", new JsonObject().put("clearer", "ABCFR").put("member", "DEFFR"), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(2, response.size());

                    compareMessages(context, DummyData.totalMarginRequirementJson.get(0), response.getJsonObject(0));
                    compareMessages(context, DummyData.totalMarginRequirementJson.get(2), response.getJsonObject(1));
                    asyncHistoryFilter.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.historyTotalMarginRequirement!");
            }
        });
    }

    @Test
    public void testMarginShortfallSurplus(TestContext context) throws InterruptedException {
        // Feed the data into the store
        DummyData.marginShortfallSurplusJson.forEach(mss -> {
            vertx.eventBus().publish("ers.MarginShortfallSurplus", mss);
        });

        // Test the latest query
        final Async asyncLatest = context.async();
        vertx.eventBus().send("query.latestMarginShortfallSurplus", new JsonObject(), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(2, response.size());

                    compareMessages(context, DummyData.marginShortfallSurplusJson.get(2), response.getJsonObject(1));
                    compareMessages(context, DummyData.marginShortfallSurplusJson.get(3), response.getJsonObject(0));
                    asyncLatest.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.latestMarginShortfallSurplus!");
            }
        });

        // Test the latest query with filter
        final Async asyncLatestFilter = context.async();
        vertx.eventBus().send("query.latestMarginShortfallSurplus", new JsonObject().put("clearer", "ABCFR").put("member", "DEFFR"), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(1, response.size());

                    compareMessages(context, DummyData.marginShortfallSurplusJson.get(2), response.getJsonObject(0));
                    asyncLatestFilter.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.latestMarginShortfallSurplus!");
            }
        });

        // Test the history query
        final Async asyncHistory = context.async();
        vertx.eventBus().send("query.historyMarginShortfallSurplus", new JsonObject(), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(4, response.size());

                    compareMessages(context, DummyData.marginShortfallSurplusJson.get(0), response.getJsonObject(0));
                    compareMessages(context, DummyData.marginShortfallSurplusJson.get(1), response.getJsonObject(1));
                    compareMessages(context, DummyData.marginShortfallSurplusJson.get(2), response.getJsonObject(2));
                    compareMessages(context, DummyData.marginShortfallSurplusJson.get(3), response.getJsonObject(3));
                    asyncHistory.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.historyMarginShortfallSurplus!");
            }
        });

        // Test the history query with filter
        final Async asyncHistoryFilter = context.async();
        vertx.eventBus().send("query.historyMarginShortfallSurplus", new JsonObject().put("clearer", "ABCFR").put("member", "DEFFR"), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(2, response.size());

                    compareMessages(context, DummyData.marginShortfallSurplusJson.get(0), response.getJsonObject(0));
                    compareMessages(context, DummyData.marginShortfallSurplusJson.get(2), response.getJsonObject(1));
                    asyncHistoryFilter.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.historyMarginShortfallSurplus!");
            }
        });
    }

    @Test
    public void testRiskLimit(TestContext context) throws InterruptedException {
        // Feed the data into the store
        DummyData.riskLimitJson.forEach(rl -> {
            vertx.eventBus().publish("ers.RiskLimit", new JsonArray().add(rl));
        });

        // Test the latest query
        final Async asyncLatest = context.async();
        vertx.eventBus().send("query.latestRiskLimit", new JsonObject(), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(2, response.size());

                    compareMessages(context, DummyData.riskLimitJson.get(2), response.getJsonObject(1));
                    compareMessages(context, DummyData.riskLimitJson.get(3), response.getJsonObject(0));
                    asyncLatest.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.latestRiskLimit!");
            }
        });

        // Test the latest query with filter
        final Async asyncLatestFilter = context.async();
        vertx.eventBus().send("query.latestRiskLimit", new JsonObject().put("clearer", "ABCFR").put("member", "DEFFR"), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(1, response.size());

                    compareMessages(context, DummyData.riskLimitJson.get(2), response.getJsonObject(0));
                    asyncLatestFilter.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.latestRiskLimit!");
            }
        });

        // Test the history query
        final Async asyncHistory = context.async();
        vertx.eventBus().send("query.historyRiskLimit", new JsonObject(), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(4, response.size());

                    compareMessages(context, DummyData.riskLimitJson.get(0), response.getJsonObject(0));
                    compareMessages(context, DummyData.riskLimitJson.get(1), response.getJsonObject(1));
                    compareMessages(context, DummyData.riskLimitJson.get(2), response.getJsonObject(2));
                    compareMessages(context, DummyData.riskLimitJson.get(3), response.getJsonObject(3));
                    asyncHistory.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.historyRiskLimit!");
            }
        });

        // Test the history query with filter
        final Async asyncHistoryFilter = context.async();
        vertx.eventBus().send("query.historyRiskLimit", new JsonObject().put("clearer", "ABCFR").put("member", "DEFFR"), ar -> {
            if (ar.succeeded())
            {
                try {
                    JsonArray response = new JsonArray((String) ar.result().body());

                    context.assertEquals(2, response.size());

                    compareMessages(context, DummyData.riskLimitJson.get(0), response.getJsonObject(0));
                    compareMessages(context, DummyData.riskLimitJson.get(2), response.getJsonObject(1));
                    asyncHistoryFilter.complete();
                }
                catch (Exception e)
                {
                    context.fail(e);
                }
            }
            else
            {
                context.fail("Didn't received a response to query.historyRiskLimit!");
            }
        });
    }

    @AfterClass
    public static void tearDown(TestContext context) {
        MongoDBPersistenceVerticleIT.vertx.close(context.asyncAssertSuccess());
    }
}
