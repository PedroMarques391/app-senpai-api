import { ObjectId } from "mongodb";

export interface FollowsRepository {
    isFollowing(followerId: ObjectId, followingId: ObjectId): Promise<boolean>;
    follow(followerId: ObjectId, followingId: ObjectId): Promise<void>;
    unfollow(followerId: ObjectId, followingId: ObjectId): Promise<void>;
    getFollowers(userId: ObjectId): Promise<ObjectId[]>;
    getFollowing(userId: ObjectId): Promise<ObjectId[]>;
    totalFollowers(userId: ObjectId): Promise<number>;
    totalFollowing(userId: ObjectId): Promise<number>;
}