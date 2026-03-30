import scheduleGitActions from "./git/gitActions";
import mongoose from "mongoose";
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty'
  },
});

const dbUrl = process.env.DATABASE_URL;

async function main() {
  try {
    if (dbUrl){
      await mongoose.connect(dbUrl);
    }
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().command({ ping: 1 });
    }
    logger.info("Pinged your deployment. Successfully connected to MongoDB!");
  } catch(error) {
    logger.error(error);
  }

  await scheduleGitActions();
}

main();
