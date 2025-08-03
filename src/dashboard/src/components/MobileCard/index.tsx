import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  useTheme,
  useMediaQuery,
  alpha
} from '@mui/material';
import { ChevronRight as ChevronRightIcon } from '@mui/icons-material';

export interface MobileCardAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  variant?: 'text' | 'outlined' | 'contained';
}

export interface MobileCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  status?: {
    label: string;
    color?: 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    variant?: 'filled' | 'outlined';
  };
  metadata?: Array<{
    label: string;
    value: string | number;
    icon?: React.ReactNode;
  }>;
  actions?: MobileCardAction[];
  onClick?: () => void;
  showChevron?: boolean;
  elevation?: number;
  sx?: any;
  children?: React.ReactNode;
}

const MobileCard: React.FC<MobileCardProps> = ({
  title,
  subtitle,
  description,
  status,
  metadata = [],
  actions = [],
  onClick,
  showChevron = false,
  elevation = 1,
  sx = {},
  children
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <Card
      elevation={elevation}
      onClick={handleCardClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        minHeight: isMobile ? '120px' : 'auto',
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
          borderColor: alpha(theme.palette.primary.main, 0.3),
        } : {},
        '&:active': onClick ? {
          transform: 'translateY(0px)',
          boxShadow: theme.shadows[2],
        } : {},
        ...sx
      }}
    >
      <CardContent
        sx={{
          padding: isMobile ? 2.5 : 2,
          paddingBottom: actions.length > 0 ? 1 : 2.5,
          '&:last-child': {
            paddingBottom: actions.length > 0 ? 1 : 2.5,
          }
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box flex={1} mr={showChevron ? 1 : 0}>
            <Typography
              variant="h6"
              component="h3"
              sx={{
                fontSize: isMobile ? '1.125rem' : '1rem',
                fontWeight: 600,
                lineHeight: 1.3,
                mb: subtitle ? 0.5 : 0,
                color: theme.palette.text.primary
              }}
            >
              {title}
            </Typography>
            
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: isMobile ? '0.875rem' : '0.8125rem',
                  lineHeight: 1.4,
                  mb: 1
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            {status && (
              <Chip
                label={status.label}
                color={status.color || 'default'}
                variant={status.variant || 'filled'}
                size={isMobile ? 'medium' : 'small'}
                sx={{
                  height: isMobile ? '28px' : '24px',
                  fontSize: isMobile ? '0.8125rem' : '0.75rem',
                  fontWeight: 500
                }}
              />
            )}
            
            {showChevron && (
              <IconButton
                size="small"
                sx={{
                  minWidth: '32px',
                  minHeight: '32px',
                  color: theme.palette.text.secondary
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: isMobile ? '0.875rem' : '0.8125rem',
              lineHeight: 1.5,
              mb: metadata.length > 0 ? 1.5 : 0
            }}
          >
            {description}
          </Typography>
        )}

        {metadata.length > 0 && (
          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={isMobile ? 1 : 2}
            sx={{ mt: 1 }}
          >
            {metadata.map((item, index) => (
              <Box
                key={index}
                display="flex"
                alignItems="center"
                gap={0.75}
                sx={{
                  minHeight: isMobile ? '24px' : '20px'
                }}
              >
                {item.icon && (
                  <Box
                    sx={{
                      color: theme.palette.text.secondary,
                      display: 'flex',
                      alignItems: 'center',
                      '& .MuiSvgIcon-root': {
                        fontSize: isMobile ? '1rem' : '0.875rem'
                      }
                    }}
                  >
                    {item.icon}
                  </Box>
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: isMobile ? '0.8125rem' : '0.75rem',
                    fontWeight: 500,
                    mr: 0.5
                  }}
                >
                  {item.label}:
                </Typography>
                <Typography
                  variant="caption"
                  color="text.primary"
                  sx={{
                    fontSize: isMobile ? '0.8125rem' : '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}

        {children && (
          <Box sx={{ mt: 1.5 }}>
            {children}
          </Box>
        )}
      </CardContent>

      {actions.length > 0 && (
        <CardActions
          sx={{
            padding: isMobile ? '8px 20px 16px' : '8px 16px 12px',
            justifyContent: 'flex-end',
            gap: 1
          }}
        >
          {actions.map((action, index) => (
            <IconButton
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              color={action.color || 'default'}
              sx={{
                minWidth: isMobile ? '44px' : '36px',
                minHeight: isMobile ? '44px' : '36px',
                borderRadius: 2,
                ...(action.variant === 'outlined' && {
                  border: `1px solid ${theme.palette.divider}`,
                }),
                ...(action.variant === 'contained' && {
                  backgroundColor: theme.palette[action.color || 'primary'].main,
                  color: theme.palette[action.color || 'primary'].contrastText,
                  '&:hover': {
                    backgroundColor: theme.palette[action.color || 'primary'].dark,
                  }
                })
              }}
              title={action.label}
            >
              {action.icon}
            </IconButton>
          ))}
        </CardActions>
      )}
    </Card>
  );
};

export default MobileCard;