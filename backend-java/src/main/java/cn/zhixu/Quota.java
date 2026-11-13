package cn.zhixu;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Single-process ledger. H2's exclusive file lock prevents two processes sharing this file. */
@Component
class Quota {
    final JdbcTemplate db;
    final TransactionTemplate transactions;
    @Value("${zhixu.daily-limit}") int limit;
    @Value("${zhixu.global-limit}") int globalLimit;
    Quota(JdbcTemplate db) { this.db=db;this.transactions=new TransactionTemplate(new DataSourceTransactionManager(Objects.requireNonNull(db.getDataSource()))); }
    String day() { return LocalDate.now(ZoneId.of("Asia/Shanghai")).toString(); }
    synchronized int remaining(UUID user) {
        return Math.max(0,limit-db.queryForObject("SELECT COUNT(*) FROM ai_calls WHERE user_id=? AND day_key=?",Integer.class,user.toString(),day()));
    }
    synchronized String reserve(UUID user, UUID request, String hash) {
        return transactions.execute(status -> {
            // Serialize quota reservations across server instances, not only JVM threads.
            db.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
                if(connection.getMetaData().getDatabaseProductName().equals("PostgreSQL")) {
                    try(var statement=connection.prepareStatement("SELECT pg_advisory_xact_lock(20481114)")) { statement.execute(); }
                }
                return null;
            });
            return reserveWithinTransaction(user,request,hash);
        });
    }
    private String reserveWithinTransaction(UUID user, UUID request, String hash) {
        var rows=db.queryForList("SELECT * FROM ai_calls WHERE request_id=?",request.toString());
        if(!rows.isEmpty()) {
            var row=rows.getFirst();
            if(!user.toString().equals(row.get("USER_ID")) || !hash.equals(row.get("INPUT_HASH"))) throw new ApiError(409,"请求编号已使用，请重新发起");
            if("done".equals(row.get("STATE"))) return db.queryForObject("SELECT answer FROM ai_calls WHERE request_id=?",String.class,request.toString());
            throw new ApiError(409,"这次请求正在处理或已失败，请稍后重新发起");
        }
        int global=db.queryForObject("SELECT COUNT(*) FROM ai_calls WHERE day_key=?",Integer.class,day());
        int recent=db.queryForObject("SELECT COUNT(*) FROM ai_calls WHERE user_id=? AND created_at>?",Integer.class,user.toString(),System.currentTimeMillis()-60000);
        if(remaining(user)==0 || global>=globalLimit) throw new ApiError(429,"今日讲解额度已用完，请明天再来");
        if(recent>=5) throw new ApiError(429,"请求有点密集，请一分钟后再试");
        db.update("INSERT INTO ai_calls(request_id,user_id,input_hash,day_key,created_at,state) VALUES(?,?,?,?,?,'running')",request.toString(),user.toString(),hash,day(),System.currentTimeMillis());
        return null;
    }
    void finish(UUID request,String answer) { db.update("UPDATE ai_calls SET state=?,answer=? WHERE request_id=?",answer==null?"failed":"done",answer,request.toString()); }
}
