import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  CircularProgress,
  Box,
  Divider,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useAuth } from '../../context/AuthContext';
import { START_COOKING_SESSION } from '@services/cookingAssistant';

// Query to get recipes
const GET_RECIPES = gql`
  query GetRecipes($search: String, $tags: [String!]) {
    recipes(search: $search, tags: $tags) {
      id
      name
      description
      prepTime
      cookTime
      servings
      tags
      averageRating
    }
  }
`;

interface RecipeSelectorProps {
  open: boolean;
  onClose: () => void;
  onRecipeSelected: () => void;
}

const RecipeSelector = ({ open, onClose, onRecipeSelected }: RecipeSelectorProps) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // Query to get recipes
  const { loading, error, data } = useQuery(GET_RECIPES, {
    variables: { search: searchTerm || undefined },
    skip: !open
  });

  // Mutation to start cooking session
  const [startCookingSession, { loading: startingSession }] = useMutation(START_COOKING_SESSION, {
    onCompleted: () => {
      onRecipeSelected();
    }
  });

  // Handle search change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Handle recipe selection
  const handleRecipeSelect = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
  };

  // Handle start session
  const handleStartSession = () => {
    if (selectedRecipeId && user?.member?.id) {
      startCookingSession({
        variables: {
          input: {
            memberId: user.member.id,
            recipeId: selectedRecipeId
          }
        }
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Select a Recipe</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="search"
          label="Search Recipes"
          type="text"
          fullWidth
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ mb: 2 }}
        />

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">Error loading recipes</Typography>
        ) : data?.recipes?.length > 0 ? (
          <List sx={{ width: '100%' }}>
            {data.recipes.map((recipe: any) => (
              <Box key={recipe.id}>
                <ListItem
                  alignItems="flex-start"
                  button
                  selected={selectedRecipeId === recipe.id}
                  onClick={() => handleRecipeSelect(recipe.id)}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                      },
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>
                      <RestaurantMenuIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={recipe.name}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {recipe.description}
                        </Typography>
                        <Typography
                          component="div"
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          Prep: {recipe.prepTime} min | Cook: {recipe.cookTime} min | Servings: {recipe.servings}
                        </Typography>
                        {recipe.tags && (
                          <Box sx={{ mt: 1 }}>
                            {recipe.tags.map((tag: string) => (
                              <Typography
                                key={tag}
                                component="span"
                                variant="body2"
                                sx={{
                                  backgroundColor: 'primary.light',
                                  color: 'primary.contrastText',
                                  borderRadius: 1,
                                  px: 1,
                                  py: 0.5,
                                  mr: 1,
                                  display: 'inline-block',
                                  fontSize: '0.75rem',
                                }}
                              >
                                {tag}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </Box>
            ))}
          </List>
        ) : (
          <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
            No recipes found. Try a different search term.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleStartSession}
          color="primary"
          variant="contained"
          disabled={!selectedRecipeId || startingSession}
        >
          {startingSession ? <CircularProgress size={24} /> : 'Start Cooking'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecipeSelector;
