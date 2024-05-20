"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/*******************************************************************************/

class Story {


  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  getHostName() {
    return new URL(this.url).host;
  }
}
/*The above section of code creates an instance using the data supplied within the
constructors and then extracts the host name from the URL using the URL class.
/******************************************************************************
*/

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }
//Initializes the story array.

  static async getStories() {
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
    });
    const stories = response.data.stories.map(story => new Story(story));
    return new StoryList(stories);
  }

  async addStory(user, {title, author, url}) {
    const token = user.loginToken;
    const response = await axios ({
      method: "POST",
      url: `${BASE_URL}/stories`,
      data: {token, story: {title, author, url} },
    });

    const story = new Story(response.data.story);
    this.stories.unshift(story);
    user.ownStories.unshift(story);

    return story;

  }

  async removeStory(user, storyId) {
    const token = user.loginToken;
    await axios({
      url: `${BASE_URL}/stories/${storyId}` ,
      method: "DELETE",
      data: {token: user.loginToken }
    });

    this.stories = this.stories.filter(story => story.storyId !== storyId);

    user.ownStories = user.ownStories.filter(s => s.storyId !== storyId);
    user.favorites = user.favorites.filter(s => s.storyId !== storyId);
  }
}

/*The above section of the code updates the API according to user preferences.
With the getStories fetching and returning a StoryList instance. addStory and removeStory
fulfill the function of adding stories and removing stories from the list respectively.
/*******************************************************************************/

class User {

  constructor({
                username,
                name,
                createdAt,
                favorites = [],
                ownStories = []
              },
              token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;
    //initializes the user provides identifying details and login token

    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    //  login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  static async signup(username, password, name) {
    const response = await axios({
      url: `${BASE_URL}/signup`,
      method: "POST",
      data: { user: { username, password, name } },
    });

    let { user } = response.data

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios({
      url: `${BASE_URL}/login`,
      method: "POST",
      data: { user: { username, password } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /*This function does allows for automatic login when the credentials are provided.*/

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }

//Add story to the list of user favorites
async addFavorite(story) {
  this.favorites.push(story);
  await this._addOrRemoveFavorite("add", story)
}

//Remove Story
async removeFavorite(story) {
  this.favorites = this.favorites.filter(s => s.storyId !== story.storyId);
  await this._addOrRemoveFavorite("remove", story);
}

// Update API

async _addOrRemoveFavorite(newState, story) {
  const method = newState === "add" ? "POST" : "DELETE";
  const token = this.loginToken;
  await axios ({
    url: `${BASE_URL}/users/${this.username}/favorites/${story.storyId}`,
    method: method,
    data: { token },
  });
}

//Return true/false if given a story instance is a favorite of the user

isFavorite(story) {
  return this.favorites.some(s => (s.storyId === story.storyId));
}
}
// This code section deals with how the User interacts with the data that has
// been saved according to prior interactions (deals with login settings)