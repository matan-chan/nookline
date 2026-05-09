import { ApolloClient, InMemoryCache, HttpLink, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { getStoredToken } from "../auth/authStorage";

const graphqlUri = import.meta.env.VITE_GRAPHQL_URI?.trim() || "/api/graphql";
const httpLink = new HttpLink({ uri: graphqlUri });

const authLink = setContext((_, { headers }) => {
  const t = getStoredToken();
  return { headers: { ...headers, ...(t ? { authorization: `Bearer ${t}` } : {}) } };
});

const client = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
});

export default client;
