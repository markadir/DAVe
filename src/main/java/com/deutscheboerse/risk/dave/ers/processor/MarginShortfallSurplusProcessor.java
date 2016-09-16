package com.deutscheboerse.risk.dave.ers.processor;

import com.deutscheboerse.risk.dave.ers.jaxb.MarginRequirementReportMessageT;
import com.deutscheboerse.risk.dave.ers.jaxb.AbstractMessageT;
import com.deutscheboerse.risk.dave.ers.jaxb.FIXML;
import com.deutscheboerse.risk.dave.ers.jaxb.MarginAmountBlockT;
import io.vertx.core.json.JsonObject;

import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import javax.xml.bind.JAXBElement;

import org.apache.camel.Exchange;
import org.apache.camel.Message;
import org.apache.camel.Processor;

public class MarginShortfallSurplusProcessor extends AbstractProcessor implements Processor {

    private JsonObject parseFromFIXML(FIXML fixml) {
        JAXBElement<? extends AbstractMessageT> msg = fixml.getMessage();
        MarginRequirementReportMessageT mrrMessage = (MarginRequirementReportMessageT) msg.getValue();

        JsonObject mss = new JsonObject();
        mss.put("received", new JsonObject().put("$date", timestampFormatter.format(new Date())));
        mss.put("reqId", mrrMessage.getID());
        mss.put("sesId", mrrMessage.getSetSesID().toString());
        mss.put("rptId", mrrMessage.getRptID());
        mss.put("txnTm", new JsonObject().put("$date", timestampFormatter.format(mrrMessage.getTxnTm().toGregorianCalendar().getTime())));
        mss.put("bizDt", new JsonObject().put("$date", timestampFormatter.format(mrrMessage.getBizDt().toGregorianCalendar().getTime())));
        mss.put("clearingCcy", mrrMessage.getCcy());

        processParties(mrrMessage.getPty(), mss);

        List<MarginAmountBlockT> margins = mrrMessage.getMgnAmt();
        Set<String> typs = new HashSet<>();
        typs.add("5");
        typs.add("13");
        typs.add("14");
        typs.add("15");
        typs.add("19");
        typs.add("22");
        processMarginBlocks(margins, Collections.unmodifiableSet(typs), mss);

        return mss;
    }

   @Override
   public void process(Exchange exchange) {
        Message in = exchange.getIn();
        in.setBody(this.parseFromFIXML((FIXML)in.getBody()));
    }
}