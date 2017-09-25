CREATE TABLE trades (
	id serial PRIMARY KEY,
	dt timestamp without time zone NOT NULL,
	exchange text NOT NULL,
	trade jsonb NOT NULL,
	books jsonb NOT NULL
);