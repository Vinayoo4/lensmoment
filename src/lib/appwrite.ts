import { Client, Databases } from "appwrite";

const client = new Client()
    .setEndpoint("https://fra.cloud.appwrite.io/v1")
    .setProject("69c3aeb5001e29bce67a");

const databases = new Databases(client);

export { client, databases };
