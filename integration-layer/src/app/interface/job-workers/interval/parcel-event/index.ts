import { AppDataSource } from "../../../../infrastructure/exchange-database.config";
import { ILDataSource } from "../../../../infrastructure/database.config";
import { ParcelEvent } from "../../../../infrastructure/entity/parcel-event/index";
import * as cron from "node-cron";
import { schemaResolvers } from "../../../resolvers/parcel-event";
import { IWorker } from "../../interface";
import { logger } from "../../../../core/services/logger/index";
import { MoreThan } from "typeorm";
import { Log } from "../../../../infrastructure/entity/log/index";
import { getJetStreamConnection } from "../../../../infrastructure/nats/jetstream";
import { OperationFunction, retry } from "../../../../utils/retry/index";

export class ParcelEventWorker implements IWorker {
  private lastSentAt: Date = new Date(0);
  private subjectName: string = "parcel-event";
  private schemaVersion: string = "v1";

  constructor() {}

  static async create() {
    const worker = new ParcelEventWorker();
    await worker.init();
    await worker.loadLastSentAt();
    return worker;
  }

  async init() {}

  async loadLastSentAt() {
    try {
      const log = await ILDataSource.manager.findOne(Log, {
        where: { id: "uuid_is_overkill_here" },
      });
      if (log) {
        this.lastSentAt = new Date(log.lastConsumedAt);
      }
    } catch (error) {
      logger.error({ message: error.message }, "Error loading last sent at");
    }
  }

  async saveLastSentAt(lastSentAt: Date) {
    try {
      const log = await ILDataSource.manager.findOne(Log, {
        where: { id: "uuid_is_overkill_here" },
      });

      if (log) {
        log.lastConsumedAt = lastSentAt.toISOString();
        await ILDataSource.manager.update(Log, log.id, log);
      } else {
        const newLog = new Log({
          id: "uuid_is_overkill_here",
          lastConsumedAt: lastSentAt.toISOString(),
        });
        await ILDataSource.manager.save(newLog);
      }

      if (lastSentAt > this.lastSentAt) {
        this.lastSentAt = lastSentAt;
      }
    } catch (error) {
      logger.error({ error }, "Error saving last sent at");
    }
  }

  async startCronJob() {
    try {
      cron.schedule("* * * * * *", async () => {
        try {
          const parcelEvents = await AppDataSource.manager.find(ParcelEvent, {
            where: {
              updatedAt: MoreThan(this.lastSentAt.toISOString()),
            },
            order: { createdAt: "ASC" },
          });

          const encodeParcelEvent = (parcelEvent: ParcelEvent) => {
            const schemaResolver = schemaResolvers[this.schemaVersion];
            if (!schemaResolver) return null;

            try {
              const { schema } = schemaResolver;
              return schema.toBuffer(parcelEvent);
            } catch (error) {
              return null;
            }
          };

          for (const parcelEvent of parcelEvents) {
            const updatedAtDate = new Date(parcelEvent.updatedAt);
            if (updatedAtDate > this.lastSentAt) {
              const encodedParcel = encodeParcelEvent(parcelEvent);

              if (encodedParcel) {
                const operation: OperationFunction<void> = async () => {
                  const nats = await getJetStreamConnection(this.subjectName);
                  await nats.publish(this.subjectName, encodedParcel);
                  logger.info(
                    {
                      version: this.schemaVersion,
                      id: parcelEvent.id,
                    },
                    "Publishing parcel event:"
                  );
                  this.lastSentAt = updatedAtDate;
                  await this.saveLastSentAt(this.lastSentAt);
                };

                try {
                  await retry(operation, 3, 100);
                } catch (error) {
                  logger.error(
                    { error, id: parcelEvent.id },
                    "Error publishing parcel event after retries"
                  );
                }
              } else {
                logger.error(
                  { parcelEvent },
                  "Unsupported schema version for parcel event"
                );
              }
            }
          }
        } catch (error) {
          logger.error({ error }, "Error processing parcel events");
        }
      });
    } catch (error) {
      logger.error({ error }, "Error starting cron job");
    }
  }
}
