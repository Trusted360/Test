import { gql } from '@apollo/client';

// Queries
export const GET_COOKING_SESSION = gql`
  query GetCookingSession($id: ID!) {
    cookingSession(id: $id) {
      id
      memberId
      recipeId
      recipe {
        id
        name
        description
        prepTime
        cookTime
        servings
        ingredients {
          id
          ingredient {
            id
            name
          }
          quantity
          unit
        }
        instructions
      }
      startTime
      endTime
      currentStep
      totalSteps
      status
      messages {
        id
        role
        content
        timestamp
      }
    }
  }
`;

export const GET_ACTIVE_COOKING_SESSIONS = gql`
  query GetActiveCookingSessions($memberId: ID!) {
    activeCookingSessions(memberId: $memberId) {
      id
      recipeId
      recipe {
        id
        name
      }
      startTime
      currentStep
      totalSteps
      status
    }
  }
`;

export const GET_COOKING_SESSION_MESSAGES = gql`
  query GetCookingSessionMessages($sessionId: ID!) {
    cookingSessionMessages(sessionId: $sessionId) {
      id
      role
      content
      timestamp
    }
  }
`;

// Mutations
export const START_COOKING_SESSION = gql`
  mutation StartCookingSession($input: CookingSessionInput!) {
    startCookingSession(input: $input) {
      sessionId
      recipe {
        id
        name
        description
        prepTime
        cookTime
        servings
        ingredients {
          id
          ingredient {
            id
            name
          }
          quantity
          unit
        }
        instructions
      }
      message
      currentStep
      totalSteps
    }
  }
`;

export const SEND_COOKING_MESSAGE = gql`
  mutation SendCookingMessage($input: CookingMessageInput!) {
    sendCookingMessage(input: $input) {
      sessionId
      message
      currentStep
      totalSteps
    }
  }
`;

export const GET_NEXT_COOKING_STEP = gql`
  mutation GetNextCookingStep($sessionId: ID!) {
    getNextCookingStep(sessionId: $sessionId) {
      sessionId
      message
      currentStep
      totalSteps
      completed
    }
  }
`;

export const GET_PREVIOUS_COOKING_STEP = gql`
  mutation GetPreviousCookingStep($sessionId: ID!) {
    getPreviousCookingStep(sessionId: $sessionId) {
      sessionId
      message
      currentStep
      totalSteps
    }
  }
`;

export const GET_INGREDIENT_SUBSTITUTIONS = gql`
  mutation GetIngredientSubstitutions($input: IngredientSubstitutionInput!) {
    getIngredientSubstitutions(input: $input) {
      sessionId
      ingredient
      substitutions {
        name
        description
        conversionRatio
        flavor
        suitability
        instructionChanges
      }
      message
    }
  }
`;

export const END_COOKING_SESSION = gql`
  mutation EndCookingSession($input: EndSessionInput!) {
    endCookingSession(input: $input) {
      sessionId
      recipe {
        id
        title
      }
      startTime
      endTime
      duration
      status
    }
  }
`;
