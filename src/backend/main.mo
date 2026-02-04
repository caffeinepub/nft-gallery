import AccessControl "authorization/access-control";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";
import Storage "blob-storage/Storage";
import Time "mo:core/Time";

actor {
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type PostId = Nat;
  public type CommentId = Nat;
  public type UserId = Principal;

  public type UserProfile = {
    username : Text;
    email : Text;
  };

  public type PostMetadata = {
    description : Text;
    author : ?Principal;
  };

  public type NftPost = {
    id : Nat;
    metadata : PostMetadata;
    images : [Storage.ExternalBlob];
    comments : [Nat];
    timestamp : Time.Time;
    author : Principal;
  };

  public type Comment = {
    id : Nat;
    postId : Nat;
    content : Text;
    timestamp : Time.Time;
    parentId : ?Nat;
    replies : [Nat];
    author : Principal;
  };

  var nextPostId = 0;
  var nextCommentId = 0;

  type OldLikes = Map.Map<Nat, List.List<Principal>>;
  let posts = Map.empty<Nat, NftPost>();
  let comments = Map.empty<Nat, Comment>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let followers = Map.empty<Principal, Set.Set<Principal>>();
  let likes = Map.empty<Nat, Set.Set<Principal>>();

  public func isEmpty(s : Text) : async Bool {
    s.trim(#char ' ').size() == 0;
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) {
      return null;
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller.isAnonymous()) {
      return null;
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous caller cannot save profile");
    };
    if (profile.username.trim(#char ' ').size() == 0 or profile.email.trim(#char ' ').size() == 0) {
      Runtime.trap("Username and email must not be empty");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func followUser(targetUser : UserId) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous caller cannot follow users");
    };

    if (caller == targetUser) {
      Runtime.trap("You cannot follow yourself");
    };

    let userProfile = switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Missing user profile") };
      case (?profile) { profile };
    };

    if (userProfile.username.trim(#char ' ').size() == 0 or userProfile.email.trim(#char ' ').size() == 0) {
      Runtime.trap("Username and email must not be empty");
    };

    if (not userProfiles.containsKey(targetUser)) {
      Runtime.trap("Target user does not exist");
    };

    let currentFollowers = switch (followers.get(caller)) {
      case (null) { Set.empty<UserId>() };
      case (?existingFollowers) { existingFollowers };
    };

    if (currentFollowers.contains(targetUser)) {
      Runtime.trap("Already following this user");
    };

    currentFollowers.add(targetUser);
    followers.add(caller, currentFollowers);
  };

  public shared ({ caller }) func unfollowUser(targetUser : UserId) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous caller cannot unfollow users");
    };

    if (caller == targetUser) {
      Runtime.trap("You cannot unfollow yourself");
    };

    let profile = switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Missing user profile") };
      case (?p) { p };
    };

    if (profile.username.trim(#char ' ').size() == 0 or profile.email.trim(#char ' ').size() == 0) {
      Runtime.trap("Username and email must not be empty");
    };

    switch (followers.get(caller)) {
      case (null) { Runtime.trap("Not following any users") };
      case (?currentFollowers) {
        if (not currentFollowers.contains(targetUser)) {
          Runtime.trap("Not following this user");
        };

        currentFollowers.remove(targetUser);

        if (currentFollowers.isEmpty()) {
          followers.remove(caller);
        } else {
          followers.add(caller, currentFollowers);
        };
      };
    };
  };

  public query ({ caller }) func isFollowingUser(targetUser : UserId) : async Bool {
    if (caller.isAnonymous()) {
      return false;
    };

    switch (followers.get(caller)) {
      case (null) { false };
      case (?followersSet) {
        followersSet.contains(targetUser);
      };
    };
  };

  public query ({ caller }) func getFollowers() : async [UserId] {
    if (caller.isAnonymous()) {
      return [];
    };

    switch (followers.get(caller)) {
      case (null) { [] };
      case (?followersSet) {
        followersSet.toArray();
      };
    };
  };

  public query ({ caller }) func getFollowing() : async [UserId] {
    if (caller.isAnonymous()) {
      return [];
    };

    switch (followers.get(caller)) {
      case (null) { [] };
      case (?followersSet) {
        followersSet.toArray();
      };
    };
  };

  public shared ({ caller }) func createNftPost(
    metadata : PostMetadata,
    images : [Storage.ExternalBlob]
  ) : async Nat {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous caller cannot create post");
    };
    if (images.size() > 4) {
      Runtime.trap("Too many images. Maximum is 4.");
    };
    let userProfile = switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Missing user profile") };
      case (?profile) { profile };
    };
    if (userProfile.username.trim(#char ' ').size() == 0 or userProfile.email.trim(#char ' ').size() == 0) {
      Runtime.trap("Username and email must not be empty");
    };
    if (metadata.description.trim(#char ' ').size() == 0) {
      Runtime.trap("Description must not be empty");
    };

    let postId = nextPostId;
    nextPostId += 1;

    let post : NftPost = {
      id = postId;
      metadata;
      images;
      comments = [];
      timestamp = Time.now();
      author = caller;
    };

    posts.add(postId, post);
    postId;
  };

  public query ({ caller }) func getAllPosts() : async [(Nat, NftPost)] {
    posts.toArray();
  };

  public query ({ caller }) func getPost(id : Nat) : async ?NftPost {
    posts.get(id);
  };

  public shared ({ caller }) func deletePost(postId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete posts");
    };

    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post not found") };
      case (?_post) {
        posts.remove(postId);
      };
    };
  };

  public shared ({ caller }) func addComment(postId : Nat, content : Text, parentId : ?Nat) : async Nat {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous caller cannot add comment");
    };
    if (content.size() > 500) {
      Runtime.trap("Comment cannot exceed 500 characters.");
    };

    let userProfile = switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Missing user profile") };
      case (?profile) { profile };
    };
    if (userProfile.username.trim(#char ' ').size() == 0 or userProfile.email.trim(#char ' ').size() == 0) {
      Runtime.trap("Username and email must not be empty");
    };
    if (content.trim(#char ' ').size() == 0) {
      Runtime.trap("Comment must not be empty");
    };

    let commentId = nextCommentId;
    nextCommentId += 1;

    let comment : Comment = {
      id = commentId;
      postId;
      content;
      timestamp = Time.now();
      parentId;
      replies = [];
      author = caller;
    };

    comments.add(commentId, comment);

    processParents(postId, parentId, commentId);

    commentId;
  };

  func processParents(postId : Nat, parentId : ?Nat, commentId : Nat) {
    switch (parentId) {
      case (null) {
        switch (posts.get(postId)) {
          case (null) { Runtime.trap("Post not found") };
          case (?post) {
            let updatedComments = appendComment(post.comments, commentId);
            updatePost(postId, post, updatedComments);
          };
        };
      };
      case (?parentCommentId) {
        switch (comments.get(parentCommentId)) {
          case (null) { Runtime.trap("Parent comment not found") };
          case (?parentComment) {
            let updatedReplies = appendComment(parentComment.replies, commentId);
            updateComment(parentCommentId, parentComment, updatedReplies);
          };
        };
      };
    };
  };

  func appendComment(comments : [Nat], commentId : Nat) : [Nat] {
    let commentsList = List.empty<Nat>();
    for (c in comments.values()) {
      commentsList.add(c);
    };
    commentsList.add(commentId);
    commentsList.toArray();
  };

  func updatePost(postId : Nat, post : NftPost, comments : [Nat]) {
    let updatedPost : NftPost = {
      id = post.id;
      metadata = post.metadata;
      images = post.images;
      comments;
      timestamp = post.timestamp;
      author = post.author;
    };
    posts.add(postId, updatedPost);
  };

  func updateComment(commentId : Nat, comment : Comment, replies : [Nat]) {
    let updatedComment : Comment = {
      id = comment.id;
      postId = comment.postId;
      content = comment.content;
      timestamp = comment.timestamp;
      parentId = comment.parentId;
      replies;
      author = comment.author;
    };
    comments.add(commentId, updatedComment);
  };

  public query ({ caller }) func getComment(id : Nat) : async ?Comment {
    comments.get(id);
  };

  public shared ({ caller }) func deleteComment(commentId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete comments");
    };

    switch (comments.get(commentId)) {
      case (null) { Runtime.trap("Comment not found") };
      case (?comment) {
        for (replyId in comment.replies.values()) {
          comments.remove(replyId);
        };

        removeFromParentOrPost(comment);
        comments.remove(commentId);
      };
    };
  };

  func removeFromParentOrPost(comment : Comment) {
    switch (comment.parentId) {
      case (null) {
        switch (posts.get(comment.postId)) {
          case (null) {};
          case (?post) {
            let updatedComments = filterOutComment(post.comments, comment.id);
            updatePost(comment.postId, post, updatedComments);
          };
        };
      };
      case (?parentId) {
        switch (comments.get(parentId)) {
          case (null) {};
          case (?parentComment) {
            let updatedReplies = filterOutComment(parentComment.replies, comment.id);
            updateComment(parentId, parentComment, updatedReplies);
          };
        };
      };
    };
  };

  func filterOutComment(comments : [Nat], commentId : Nat) : [Nat] {
    let filteredList = List.empty<Nat>();
    for (id in comments.values()) {
      if (id != commentId) {
        filteredList.add(id);
      };
    };
    filteredList.toArray();
  };

  public query ({ caller }) func getUserPosts(user : Principal) : async [NftPost] {
    let userPosts = List.empty<NftPost>();
    for ((_, post) in posts.entries()) {
      if (post.author == user) {
        userPosts.add(post);
      };
    };
    userPosts.toArray();
  };

  public query ({ caller }) func getPostComments(postId : Nat) : async [Comment] {
    let postComments = List.empty<Comment>();
    for ((_, comment) in comments.entries()) {
      if (comment.postId == postId) {
        postComments.add(comment);
      };
    };
    postComments.toArray();
  };

  /* Like system */
  public shared ({ caller }) func likePost(postId : Nat) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous caller cannot like post");
    };

    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("Missing user profile") };
      case (?profile) {
        if (profile.username.trim(#char ' ').size() == 0 or profile.email.trim(#char ' ').size() == 0) {
          Runtime.trap("Username and email must not be empty");
        };
      };
    };

    let likesSet = switch (likes.get(postId)) {
      case (null) { Set.empty<UserId>() };
      case (?existingSet) {
        if (existingSet.contains(caller)) {
          existingSet.remove(caller);

          if (existingSet.isEmpty()) {
            likes.remove(postId);
          } else {
            likes.add(postId, existingSet);
          };
          return;
        };
        existingSet;
      };
    };
    likesSet.add(caller);
    likes.add(postId, likesSet);
  };

  public query ({ caller }) func getPostLikes(postId : Nat) : async Nat {
    switch (likes.get(postId)) {
      case (null) { 0 };
      case (?likesSet) { likesSet.size() };
    };
  };

  public query ({ caller }) func hasUserLiked(postId : Nat, user : Principal) : async Bool {
    switch (likes.get(postId)) {
      case (null) { false };
      case (?likesSet) {
        likesSet.contains(user);
      };
    };
  };
};
