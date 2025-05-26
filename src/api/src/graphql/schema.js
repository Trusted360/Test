const { buildSchema } = require('graphql');

// Define GraphQL schema
const schema = buildSchema(`
  # Scalar types
  scalar JSON
  
  # Types
  type Household {
    id: ID!
    name: String!
    members: [Member!]
    mealPlans: [MealPlan!]
    shoppingLists: [ShoppingList!]
    createdAt: String!
    updatedAt: String!
  }

  type Member {
    id: ID!
    name: String!
    email: String
    role: String!
    household: Household!
    dietaryProfile: DietaryProfile
    createdAt: String!
    updatedAt: String!
  }

  type DietType {
    id: ID!
    name: String!
    description: String
    restrictions: JSON
    createdAt: String!
    updatedAt: String!
  }

  type MemberDiet {
    id: ID!
    member: Member!
    dietType: DietType!
    startsOn: String!
    endsOn: String
    notes: String
    createdAt: String!
    updatedAt: String!
  }

  type FoodAllergy {
    id: ID!
    member: Member!
    ingredient: Ingredient!
    severity: String!
    notes: String
    createdAt: String!
    updatedAt: String!
  }

  type FoodPreference {
    id: ID!
    member: Member!
    ingredient: Ingredient!
    preferenceLevel: Int!
    notes: String
    createdAt: String!
    updatedAt: String!
  }

  type DietaryProfile {
    member: Member!
    diets: [MemberDiet!]
    allergies: [FoodAllergy!]
    preferences: [FoodPreference!]
    likes: [String!]
    dislikes: [String!]
  }
  
  type CookingSession {
    id: ID!
    memberId: ID!
    recipeId: ID!
    recipe: Recipe
    startTime: String!
    endTime: String
    currentStep: Int!
    totalSteps: Int!
    status: String!
    messages: [CookingMessage!]
  }
  
  type CookingMessage {
    id: ID!
    sessionId: ID!
    role: String!
    content: String!
    timestamp: String!
  }
  
  type IngredientSubstitution {
    name: String!
    description: String!
    conversionRatio: Float
    flavor: String
    suitability: String
    instructionChanges: String
  }
  
  type CookingSessionResponse {
    sessionId: ID!
    recipe: Recipe
    message: String!
    currentStep: Int
    totalSteps: Int
    completed: Boolean
  }
  
  type SubstitutionResponse {
    sessionId: ID!
    ingredient: String!
    substitutions: [IngredientSubstitution!]
    message: String!
  }
  
  type SessionSummary {
    sessionId: ID!
    recipe: RecipeSummary!
    startTime: String!
    endTime: String!
    duration: Int!
    status: String!
  }
  
  type RecipeSummary {
    id: ID!
    title: String!
  }

  type PreferenceAdjustment {
    ingredientId: ID!
    adjustment: Int!
    confidence: Float
    reason: String
  }

  type PreferenceLearningResult {
    memberId: ID!
    recipeId: ID!
    rating: Int!
    adjustments: [PreferenceAdjustment!]
    updatedPreferences: [FoodPreference!]
  }

  type RecipeRecommendation {
    id: ID!
    title: String!
    description: String
    ingredients: [String!]
    tags: [String!]
    prepTime: Int
    cookTime: Int
    matchScore: Int
    matchReason: String
  }

  type PreferenceAnalysis {
    summary: String!
    likedCategories: [String!]
    dislikedCategories: [String!]
    recommendedCuisines: [String!]
    suggestions: [String!]
  }

  type Recipe {
    id: ID!
    name: String!
    description: String
    instructions: String
    prepTime: Int
    cookTime: Int
    servings: Int
    difficulty: String
    sourceUrl: String
    imageUrl: String
    ingredients: [RecipeIngredient!]
    tags: [String!]
    averageRating: Float
    ratingCount: Int
    ratings: [RecipeRating!]
    createdAt: String!
    updatedAt: String!
  }

  type RecipeRating {
    id: ID!
    member: Member!
    recipe: Recipe!
    rating: Int!
    feedback: String
    createdAt: String!
    updatedAt: String!
  }

  type RecipeSearchResult {
    recipes: [Recipe!]!
    pagination: PaginationInfo!
  }

  type PaginationInfo {
    total: Int!
    page: Int!
    pageSize: Int!
    pageCount: Int!
  }

  type SearchSuggestion {
    type: String!
    text: String!
  }

  type Ingredient {
    id: ID!
    name: String!
    category: String
    storeSection: String
    createdAt: String!
    updatedAt: String!
  }

  type RecipeIngredient {
    id: ID!
    recipe: Recipe!
    ingredient: Ingredient!
    quantity: Float
    unit: String
    notes: String
    createdAt: String!
    updatedAt: String!
  }

  type MealPlan {
    id: ID!
    household: Household!
    name: String!
    startDate: String!
    endDate: String!
    status: String!
    items: [MealPlanItem!]
    createdAt: String!
    updatedAt: String!
  }

  type MealPlanItem {
    id: ID!
    mealPlan: MealPlan!
    recipe: Recipe!
    plannedDate: String!
    mealType: String!
    servings: Int!
    notes: String
    createdAt: String!
    updatedAt: String!
  }

  type ShoppingList {
    id: ID!
    household: Household!
    mealPlan: MealPlan
    name: String!
    status: String!
    items: [ShoppingListItem!]
    createdAt: String!
    updatedAt: String!
  }

  type ShoppingListItem {
    id: ID!
    shoppingList: ShoppingList!
    ingredient: Ingredient
    name: String!
    quantity: Float
    unit: String
    storeSection: String
    purchased: Boolean!
    notes: String
    createdAt: String!
    updatedAt: String!
  }

  type User {
    id: ID!
    email: String!
    member: Member
    role: String!
    lastLogin: String
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type MealPlanConstraints {
    preferences: [JSON!]
    dietaryRestrictions: [JSON!]
    availableIngredients: [JSON!]
    excludedIngredients: [JSON!]
  }

  # Input Types
  input HouseholdInput {
    name: String!
  }

  input MemberInput {
    householdId: ID!
    name: String!
    email: String
    role: String
  }

  input DietTypeInput {
    name: String!
    description: String
    restrictions: JSON
  }

  input MemberDietInput {
    memberId: ID!
    dietTypeId: ID!
    startsOn: String!
    endsOn: String
    notes: String
  }

  input FoodAllergyInput {
    memberId: ID!
    ingredientId: ID!
    severity: String!
    notes: String
  }

  input FoodPreferenceInput {
    memberId: ID!
    ingredientId: ID!
    preferenceLevel: Int!
    notes: String
  }

  input RecipeInput {
    name: String!
    description: String
    instructions: String
    prepTime: Int
    cookTime: Int
    servings: Int
    difficulty: String
    sourceUrl: String
    imageUrl: String
    tags: [String!]
  }

  input RecipeIngredientInput {
    recipeId: ID!
    ingredientId: ID!
    quantity: Float
    unit: String
    notes: String
  }

  input MealPlanInput {
    householdId: ID!
    name: String!
    startDate: String!
    endDate: String!
    status: String
  }

  input MealPlanItemInput {
    mealPlanId: ID!
    recipeId: ID!
    plannedDate: String!
    mealType: String!
    servings: Int!
    notes: String
  }

  input ShoppingListInput {
    householdId: ID!
    mealPlanId: ID
    name: String!
    status: String
  }

  input ShoppingListItemInput {
    shoppingListId: ID!
    ingredientId: ID
    name: String!
    quantity: Float
    unit: String
    storeSection: String
    purchased: Boolean
    notes: String
  }

  input UserInput {
    email: String!
    password: String!
    memberId: ID
    role: String
  }

  input LoginInput {
    email: String!
    password: String!
  }
  
  input RecipeRatingInput {
    memberId: ID!
    recipeId: ID!
    rating: Int!
    feedback: String
  }
  
  input CookingSessionInput {
    memberId: ID!
    recipeId: ID!
  }
  
  input CookingMessageInput {
    sessionId: ID!
    message: String!
  }
  
  input IngredientSubstitutionInput {
    sessionId: ID!
    ingredient: String!
  }
  
  input EndSessionInput {
    sessionId: ID!
    rating: Int
    feedback: String
  }

  input DietaryRestrictionInput {
    type: String!
    value: String!
    severity: String
    reason: String
  }

  input MealPlanConstraintsInput {
    preferences: [String!]
    dietaryRestrictions: [DietaryRestrictionInput!]
    availableIngredients: [String!]
    excludedIngredients: [String!]
  }

  input GenerateMealPlanInput {
    householdId: ID!
    days: Int!
    preferences: [String!]
    dietaryRestrictions: [DietaryRestrictionInput!]
    availableIngredients: [String!]
    excludedIngredients: [String!]
  }

  # Queries
  type Query {
    # Household queries
    household(id: ID!): Household
    households: [Household!]!
    
    # Member queries
    member(id: ID!): Member
    members(householdId: ID!): [Member!]!
    
    # Diet type queries
    dietType(id: ID!): DietType
    dietTypes: [DietType!]!
    
    # Dietary preference queries
    memberDietaryProfile(memberId: ID!): DietaryProfile
    memberDiets(memberId: ID!): [MemberDiet!]!
    memberAllergies(memberId: ID!): [FoodAllergy!]!
    memberPreferences(memberId: ID!): [FoodPreference!]!
    memberLikesAndDislikes(memberId: ID!): JSON
    
    # Preference learning queries
    recipeRecommendations(memberId: ID!, limit: Int, tags: [String!]): [RecipeRecommendation!]!
    preferenceAnalysis(memberId: ID!): PreferenceAnalysis
    
  # Recipe queries
  recipe(id: ID!): Recipe
  recipes(
    search: String, 
    tags: [String!], 
    difficulty: String, 
    minRating: Float, 
    maxPrepTime: Int, 
    maxTotalTime: Int, 
    ingredients: [String!],
    sortBy: String,
    sortDirection: String,
    limit: Int,
    offset: Int
  ): RecipeSearchResult!
  recipeSuggestions(term: String!): [SearchSuggestion!]!
  recipeRating(id: ID!): RecipeRating
  recipeRatings(recipeId: ID!): [RecipeRating!]!
  memberRating(memberId: ID!, recipeId: ID!): RecipeRating
  memberRatings(memberId: ID!): [RecipeRating!]!
  averageRating(recipeId: ID!): Float
  topRatedRecipes(limit: Int, tags: [String!]): [Recipe!]!
    
    # Meal plan queries
    mealPlan(id: ID!): MealPlan
    mealPlans(householdId: ID!): [MealPlan!]!
    mealPlanConstraints(mealPlanId: ID!): MealPlanConstraints
    
    # Shopping list queries
    shoppingList(id: ID!): ShoppingList
    shoppingLists(householdId: ID!): [ShoppingList!]!
    
    # User queries
    me: User
    
    # Cooking assistant queries
    cookingSession(id: ID!): CookingSession
    activeCookingSessions(memberId: ID!): [CookingSession!]!
    cookingSessionMessages(sessionId: ID!): [CookingMessage!]!
  }

  # Mutations
  type Mutation {
    # Auth mutations
    login(input: LoginInput!): AuthPayload!
    register(input: UserInput!): AuthPayload!
    
    # Household mutations
    createHousehold(input: HouseholdInput!): Household!
    updateHousehold(id: ID!, input: HouseholdInput!): Household!
    deleteHousehold(id: ID!): Boolean!
    
    # Member mutations
    createMember(input: MemberInput!): Member!
    updateMember(id: ID!, input: MemberInput!): Member!
    deleteMember(id: ID!): Boolean!
    
    # Diet type mutations
    createDietType(input: DietTypeInput!): DietType!
    updateDietType(id: ID!, input: DietTypeInput!): DietType!
    deleteDietType(id: ID!): Boolean!
    
    # Member diet mutations
    addMemberDiet(input: MemberDietInput!): MemberDiet!
    updateMemberDiet(id: ID!, input: MemberDietInput!): MemberDiet!
    removeMemberDiet(id: ID!): Boolean!
    
    # Food allergy mutations
    addFoodAllergy(input: FoodAllergyInput!): FoodAllergy!
    updateFoodAllergy(id: ID!, input: FoodAllergyInput!): FoodAllergy!
    removeFoodAllergy(id: ID!): Boolean!
    
    # Food preference mutations
    setFoodPreference(input: FoodPreferenceInput!): FoodPreference!
    removeFoodPreference(id: ID!): Boolean!
    
    # Recipe mutations
    createRecipe(input: RecipeInput!): Recipe!
    updateRecipe(id: ID!, input: RecipeInput!): Recipe!
    deleteRecipe(id: ID!): Boolean!
    
    # Recipe ingredient mutations
    addRecipeIngredient(input: RecipeIngredientInput!): RecipeIngredient!
    updateRecipeIngredient(id: ID!, input: RecipeIngredientInput!): RecipeIngredient!
    removeRecipeIngredient(id: ID!): Boolean!
    
    # Meal plan mutations
    createMealPlan(input: MealPlanInput!): MealPlan!
    updateMealPlan(id: ID!, input: MealPlanInput!): MealPlan!
    deleteMealPlan(id: ID!): Boolean!
    
    # Meal plan item mutations
    addMealPlanItem(input: MealPlanItemInput!): MealPlanItem!
    updateMealPlanItem(id: ID!, input: MealPlanItemInput!): MealPlanItem!
    removeMealPlanItem(id: ID!): Boolean!
    
    # Meal plan constraints mutations
    updateMealPlanConstraints(mealPlanId: ID!, input: MealPlanConstraintsInput!): MealPlanConstraints!
    
    # Shopping list mutations
    createShoppingList(input: ShoppingListInput!): ShoppingList!
    updateShoppingList(id: ID!, input: ShoppingListInput!): ShoppingList!
    deleteShoppingList(id: ID!): Boolean!
    
    # Shopping list item mutations
    addShoppingListItem(input: ShoppingListItemInput!): ShoppingListItem!
    updateShoppingListItem(id: ID!, input: ShoppingListItemInput!): ShoppingListItem!
    removeShoppingListItem(id: ID!): Boolean!
    markItemPurchased(id: ID!, purchased: Boolean!): ShoppingListItem!
    
    # AI-powered mutations
    generateMealPlan(input: GenerateMealPlanInput!): MealPlan!
    regenerateMealPlan(mealPlanId: ID!, input: MealPlanConstraintsInput): MealPlan!
    generateShoppingList(mealPlanId: ID!): ShoppingList!
    
    # Preference learning mutations
    learnFromRating(input: RecipeRatingInput!): PreferenceLearningResult!
    enhanceMealPlan(mealPlanId: ID!): MealPlan!
    
    # Recipe rating mutations
    rateRecipe(input: RecipeRatingInput!): RecipeRating!
    deleteRating(id: ID!): Boolean!
    
    # Cooking assistant mutations
    startCookingSession(input: CookingSessionInput!): CookingSessionResponse!
    sendCookingMessage(input: CookingMessageInput!): CookingSessionResponse!
    getNextCookingStep(sessionId: ID!): CookingSessionResponse!
    getPreviousCookingStep(sessionId: ID!): CookingSessionResponse!
    getIngredientSubstitutions(input: IngredientSubstitutionInput!): SubstitutionResponse!
    endCookingSession(input: EndSessionInput!): SessionSummary!
  }
`);

module.exports = schema;
