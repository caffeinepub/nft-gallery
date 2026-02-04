import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface PostMetadata {
    description: string;
    author?: Principal;
}
export type UserId = Principal;
export type Time = bigint;
export interface Comment {
    id: bigint;
    content: string;
    author: Principal;
    timestamp: Time;
    replies: Array<bigint>;
    parentId?: bigint;
    postId: bigint;
}
export interface NftPost {
    id: bigint;
    metadata: PostMetadata;
    author: Principal;
    timestamp: Time;
    comments: Array<bigint>;
    images: Array<ExternalBlob>;
}
export interface UserProfile {
    username: string;
    email: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(postId: bigint, content: string, parentId: bigint | null): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createNftPost(metadata: PostMetadata, images: Array<ExternalBlob>): Promise<bigint>;
    deleteComment(commentId: bigint): Promise<void>;
    deletePost(postId: bigint): Promise<void>;
    followUser(targetUser: UserId): Promise<void>;
    getAllPosts(): Promise<Array<[bigint, NftPost]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComment(id: bigint): Promise<Comment | null>;
    getFollowers(): Promise<Array<UserId>>;
    getFollowing(): Promise<Array<UserId>>;
    getPost(id: bigint): Promise<NftPost | null>;
    getPostComments(postId: bigint): Promise<Array<Comment>>;
    getPostLikes(postId: bigint): Promise<bigint>;
    getUserPosts(user: Principal): Promise<Array<NftPost>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    hasUserLiked(postId: bigint, user: Principal): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isEmpty(s: string): Promise<boolean>;
    isFollowingUser(targetUser: UserId): Promise<boolean>;
    likePost(postId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    unfollowUser(targetUser: UserId): Promise<void>;
}
