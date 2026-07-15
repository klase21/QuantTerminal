REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA serving, serving_control FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA serving, serving_control FROM PUBLIC;
GRANT USAGE ON SCHEMA serving TO mvp_serving_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA serving TO mvp_serving_reader;
