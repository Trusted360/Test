import { ApolloClient, InMemoryCache, createHttpLink, from, ApolloLink, Operation, NextLink, FetchResult } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { Observable } from '@apollo/client/utilities';

// Connect to the real API URL
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const apiUrl = isLocalhost ? 'http://localhost:3001' : '';
console.log('Using API URL:', apiUrl || '[relative]');

// Create an http link
const httpLink = createHttpLink({
  uri: `${apiUrl}/api/graphql`,
  credentials: 'include'
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Debug link to log requests
const debugLink = new ApolloLink((operation: Operation, forward: NextLink) => {
  console.log(`[GraphQL Request] Operation: ${operation.operationName}`, operation.variables);
  
  return new Observable(observer => {
    const subscription = forward(operation).subscribe({
      next: result => {
        console.log(`[GraphQL Response] Operation: ${operation.operationName}`, result);
        observer.next(result);
      },
      error: err => {
        console.error(`[GraphQL Error] Operation: ${operation.operationName}`, err);
        observer.error(err);
      },
      complete: () => {
        observer.complete();
      }
    });
    
    return () => subscription.unsubscribe();
  });
});

// Auth link for adding the token to requests
const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage if it exists
  const token = localStorage.getItem('token');
  
  const authHeaders = {
    ...headers,
    authorization: token ? `Bearer ${token}` : '',
    'x-tenant-id': 'default'
  };
  
  return {
    headers: authHeaders,
  };
});

// Create the Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, debugLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    mutate: {
      errorPolicy: 'all'
    },
    query: {
      errorPolicy: 'all'
    }
  },
});
