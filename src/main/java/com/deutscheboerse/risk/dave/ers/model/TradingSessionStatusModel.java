package com.deutscheboerse.risk.dave.ers.model;

import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

/**
 * Created by schojak on 15.9.16.
 */
public class TradingSessionStatusModel extends AbstractModel {
    private static final String MONGO_COLLECTION = "ers.TradingSessionStatus";
    private static final AbstractModel INSTANCE = new TradingSessionStatusModel();

    protected TradingSessionStatusModel() {
    }

    public static JsonObject getLatestCommand(JsonObject params) {
        return INSTANCE.getCommand(MONGO_COLLECTION, INSTANCE.getLatestPipeline(params));
    }

    public static JsonObject getHistoryCommand(JsonObject params)
    {
        return INSTANCE.getCommand(MONGO_COLLECTION, INSTANCE.getHistoryPipeline(params));
    }

    private JsonArray getLatestPipeline()
    {
        JsonArray pipeline = new JsonArray();
        pipeline.add(new JsonObject().put("$sort", getSort()));
        pipeline.add(new JsonObject().put("$group", getGroup()));

        return pipeline;
    }

    private JsonArray getHistoryPipeline()
    {
        JsonArray pipeline = new JsonArray();
        pipeline.add(new JsonObject().put("$sort", getSort()));
        pipeline.add(new JsonObject().put("$project", getProject()));

        return pipeline;
    }

    protected JsonObject getGroup()
    {
        JsonObject group = new JsonObject();
        group.put("_id", new JsonObject().put("sesId", "$sesId"));
        group.put("id", new JsonObject().put("$last", "$_id"));
        group.put("reqId", new JsonObject().put("$last", "$reqId"));
        group.put("sesId", new JsonObject().put("$last", "$sesId"));
        group.put("stat", new JsonObject().put("$last", "$stat"));
        group.put("statRejRsn", new JsonObject().put("$last", "$statRejRsn"));
        group.put("txt", new JsonObject().put("$last", "$txt"));
        group.put("received", new JsonObject().put("$last", new JsonObject().put("$dateToString", new JsonObject().put("format", mongoTimestampFormat).put("date", "$received"))));

        return group;
    }

    protected JsonObject getProject()
    {
        JsonObject project = new JsonObject();
        project.put("_id", 0);
        project.put("id", "$_id");
        project.put("reqId", 1);
        project.put("sesId", 1);
        project.put("stat", 1);
        project.put("statRejRsn", 1);
        project.put("txt", 1);
        project.put("received", new JsonObject().put("$dateToString", new JsonObject().put("format", mongoTimestampFormat).put("date", "$received")));

        return project;
    }
}
