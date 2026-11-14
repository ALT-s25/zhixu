package cn.zhixu;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

/** Fail deployment rather than silently reset quotas or serve against an absent schema. */
@Component
@Profile("production")
class ProductionCheck implements ApplicationRunner {
    private final JdbcTemplate db;
    ProductionCheck(JdbcTemplate db) { this.db=db; }
    public void run(ApplicationArguments args) {
        db.queryForObject("SELECT count(*) FROM zhixu_backend.ai_calls",Long.class);
        db.queryForObject("SELECT count(*) FROM zhixu_backend.ai_conversations",Long.class);
        db.queryForObject("SELECT count(*) FROM zhixu_backend.ai_turns",Long.class);
    }
}
