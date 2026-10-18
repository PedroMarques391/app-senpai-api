import { AppError } from "@/errors";
import type { FollowsRepository, UserRepository } from "@/repositories";
import type { ICacheService } from "@/types";
import { MongoUtils } from "@/utils";
import type { ObjectId } from "mongodb";

export interface SocialSummary {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export interface SocialActionResult {
  success: boolean;
  message: string;
  is_following: boolean;
  followers_count: number;
  following_count: number;
}

export interface SocialSummaryResponse {
  success: boolean;
  social: SocialSummary;
}

export class FollowsService {
  constructor(
    private readonly followsRepository: FollowsRepository,
    private readonly userRepository: UserRepository,
    private cacheService: ICacheService,
  ) {}

  private getSummaryCacheKey(userId: string): string {
    return `social:summary:${userId}`;
  }

  async followUser(
    followerId: string | ObjectId,
    targetUsername: string,
  ): Promise<SocialActionResult> {
    const followerObjectId = MongoUtils.toObjectId(followerId);
    const cleanUsername = targetUsername.trim().toLowerCase();

    const targetUser = await this.userRepository.find({
      userName: cleanUsername,
    });
    if (!targetUser) {
      throw AppError.notFound("Usuário não encontrado", "USER_NOT_FOUND");
    }

    if (targetUser._id.equals(followerObjectId)) {
      throw AppError.badRequest(
        "Você não pode seguir a si mesmo",
        "CANNOT_FOLLOW_SELF",
      );
    }

    await this.followsRepository.follow(followerObjectId, targetUser._id);

    await Promise.all([
      this.cacheService.del(
        this.getSummaryCacheKey(targetUser._id.toString()),
      ),
      this.cacheService.del(
        this.getSummaryCacheKey(followerObjectId.toString()),
      ),
    ]);

    const [followersCount, followingCount] = await Promise.all([
      this.followsRepository.totalFollowers(targetUser._id),
      this.followsRepository.totalFollowing(targetUser._id),
    ]);

    return {
      success: true,
      message: `Você começou a seguir @${targetUser.userName}`,
      is_following: true,
      followers_count: followersCount,
      following_count: followingCount,
    };
  }

  async unfollowUser(
    followerId: string | ObjectId,
    targetUsername: string,
  ): Promise<SocialActionResult> {
    const followerObjectId = MongoUtils.toObjectId(followerId);
    const cleanUsername = targetUsername.trim().toLowerCase();

    const targetUser = await this.userRepository.find({
      userName: cleanUsername,
    });
    if (!targetUser) {
      throw AppError.notFound("Usuário não encontrado", "USER_NOT_FOUND");
    }

    if (targetUser._id.equals(followerObjectId)) {
      throw AppError.badRequest(
        "Você não pode deixar de seguir a si mesmo",
        "CANNOT_UNFOLLOW_SELF",
      );
    }

    await this.followsRepository.unfollow(followerObjectId, targetUser._id);

    await Promise.all([
      this.cacheService.del(
        this.getSummaryCacheKey(targetUser._id.toString()),
      ),
      this.cacheService.del(
        this.getSummaryCacheKey(followerObjectId.toString()),
      ),
    ]);

    const [followersCount, followingCount] = await Promise.all([
      this.followsRepository.totalFollowers(targetUser._id),
      this.followsRepository.totalFollowing(targetUser._id),
    ]);

    return {
      success: true,
      message: `Você deixou de seguir @${targetUser.userName}`,
      is_following: false,
      followers_count: followersCount,
      following_count: followingCount,
    };
  }

  async getSocialSummary(
    targetUsername: string,
    visitorUserId?: string | ObjectId,
  ): Promise<SocialSummaryResponse> {
    const cleanUsername = targetUsername.trim().toLowerCase();

    const targetUser = await this.userRepository.find({
      userName: cleanUsername,
    });
    if (!targetUser) {
      throw AppError.notFound("Usuário não encontrado", "USER_NOT_FOUND");
    }

    const cacheKey = this.getSummaryCacheKey(targetUser._id.toString());
    const fetchCounts = async (): Promise<{
      followers_count: number;
      following_count: number;
    }> => {
      const [followers_count, following_count] = await Promise.all([
        this.followsRepository.totalFollowers(targetUser._id),
        this.followsRepository.totalFollowing(targetUser._id),
      ]);
      return { followers_count, following_count };
    };

    const counts = await this.cacheService.getOrSet(cacheKey, fetchCounts, 60);

    let isFollowing = false;
    if (visitorUserId) {
      const visitorObjectId = MongoUtils.toObjectId(visitorUserId);
      if (!visitorObjectId.equals(targetUser._id)) {
        isFollowing = await this.followsRepository.isFollowing(
          visitorObjectId,
          targetUser._id,
        );
      }
    }

    return {
      success: true,
      social: {
        followers_count: counts.followers_count,
        following_count: counts.following_count,
        is_following: isFollowing,
      },
    };
  }
}
