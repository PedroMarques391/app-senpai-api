import { MongoInitializer } from "@/init";
import type { Follow, FollowsRepository as IFollowsRepository } from "@/models";
import type { ObjectId } from "mongodb";

export class FollowsRepository implements IFollowsRepository {
  private get collection() {
    return MongoInitializer.getDb().collection<Follow>("follows");
  }

  async isFollowing(
    followerId: ObjectId,
    followingId: ObjectId,
  ): Promise<boolean> {
    const record = await this.collection.findOne({
      followerId,
      followingId,
    });

    return Boolean(record);
  }

  async follow(followerId: ObjectId, followingId: ObjectId): Promise<void> {
    await this.collection.updateOne(
      { followerId, followingId },
      {
        $setOnInsert: {
          followerId,
          followingId,
          created_at: new Date(),
        },
      },
      { upsert: true },
    );
  }

  async unfollow(followerId: ObjectId, followingId: ObjectId): Promise<void> {
    await this.collection.deleteOne({ followerId, followingId });
  }

  async getFollowers(userId: ObjectId): Promise<ObjectId[]> {
    const records = await this.collection
      .find({ followingId: userId })
      .project<{ followerId: ObjectId }>({ followerId: 1, _id: 0 })
      .toArray();

    return records.map((record) => record.followerId);
  }

  async getFollowing(userId: ObjectId): Promise<ObjectId[]> {
    const records = await this.collection
      .find({ followerId: userId })
      .project<{ followingId: ObjectId }>({ followingId: 1, _id: 0 })
      .toArray();

    return records.map((record) => record.followingId);
  }

  async totalFollowers(userId: ObjectId): Promise<number> {
    return this.collection.countDocuments({ followingId: userId });
  }

  async totalFollowing(userId: ObjectId): Promise<number> {
    return this.collection.countDocuments({ followerId: userId });
  }
}
