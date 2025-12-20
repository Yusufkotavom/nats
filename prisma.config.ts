// eslint-disable-next-line import/no-anonymous-default-export
export default {
  datasource: {
    url: process.env.DATABASE_URL!,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL!,
  },
};
