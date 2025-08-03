import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Button,
  Avatar,
  Divider,
  Skeleton
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  ChevronRight as ChevronRightIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { MobileCard } from '../MobileCard';

export interface MobileDataGridColumn {
  field: string;
  headerName: string;
  width?: number;
  type?: 'string' | 'number' | 'date' | 'boolean' | 'actions' | 'status' | 'avatar';
  renderCell?: (params: { value: any; row: any }) => React.ReactNode;
  valueGetter?: (params: { row: any }) => any;
  sortable?: boolean;
  filterable?: boolean;
}

export interface MobileDataGridAction {
  icon: React.ReactNode;
  label: string;
  onClick: (row: any) => void;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  variant?: 'text' | 'outlined' | 'contained';
}

export interface MobileDataGridProps {
  rows: any[];
  columns: MobileDataGridColumn[];
  loading?: boolean;
  onRowClick?: (row: any) => void;
  actions?: MobileDataGridAction[];
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  primaryField?: string; // Field to use as card title
  secondaryField?: string; // Field to use as card subtitle
  statusField?: string; // Field to use for status chip
  avatarField?: string; // Field to use for avatar
  metadataFields?: string[]; // Fields to show as metadata
  searchable?: boolean;
  sortable?: boolean;
  pageSize?: number;
  disablePagination?: boolean;
}

const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower.includes('active') || statusLower.includes('completed') || statusLower.includes('resolved')) return 'success';
  if (statusLower.includes('pending') || statusLower.includes('in_progress') || statusLower.includes('processing')) return 'warning';
  if (statusLower.includes('failed') || statusLower.includes('error') || statusLower.includes('cancelled')) return 'error';
  if (statusLower.includes('draft') || statusLower.includes('new')) return 'info';
  return 'default';
};

const formatCellValue = (value: any, type?: string): string => {
  if (value === null || value === undefined) return '';
  
  switch (type) {
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    default:
      return String(value);
  }
};

const MobileDataGridSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <Stack spacing={2}>
    {Array.from({ length: count }).map((_, index) => (
      <Box key={index} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Stack spacing={1.5}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="40%" height={20} />
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
          </Stack>
        </Stack>
      </Box>
    ))}
  </Stack>
);

export const MobileDataGrid: React.FC<MobileDataGridProps> = ({
  rows,
  columns,
  loading = false,
  onRowClick,
  actions = [],
  emptyMessage = "No data available",
  emptyDescription = "There are no items to display at the moment.",
  emptyIcon,
  primaryField,
  secondaryField,
  statusField,
  avatarField,
  metadataFields = [],
  searchable = false,
  sortable = false,
  pageSize = 10,
  disablePagination = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // If not mobile, render a simple table or use original component
  if (!isMobile) {
    return (
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.field}
                  style={{
                    padding: theme.spacing(1),
                    textAlign: 'left',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    fontWeight: 600,
                    fontSize: theme.typography.body2.fontSize
                  }}
                >
                  {column.headerName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id || index}
                onClick={() => onRowClick?.(row)}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  borderBottom: `1px solid ${theme.palette.divider}`
                }}
              >
                {columns.map((column) => {
                  const value = column.valueGetter ? column.valueGetter({ row }) : row[column.field];
                  return (
                    <td
                      key={column.field}
                      style={{
                        padding: theme.spacing(1),
                        fontSize: theme.typography.body2.fontSize
                      }}
                    >
                      {column.renderCell ? column.renderCell({ value, row }) : formatCellValue(value, column.type)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    );
  }

  // Mobile card-based layout
  if (loading) {
    return <MobileDataGridSkeleton />;
  }

  if (rows.length === 0) {
    return (
      <MobileCard
        title={emptyMessage}
        description={emptyDescription}
        icon={emptyIcon}
      />
    );
  }

  return (
    <Stack spacing={2}>
      {rows.map((row, index) => {
        // Determine card content based on configured fields
        const title = primaryField ? String(row[primaryField] || '') : `Item ${index + 1}`;
        const subtitle = secondaryField ? String(row[secondaryField] || '') : undefined;
        
        // Status chip
        const statusValue = statusField ? row[statusField] : undefined;
        const status = statusValue ? {
          label: formatCellValue(statusValue),
          color: getStatusColor(statusValue)
        } : undefined;

        // Avatar
        const avatarValue = avatarField ? row[avatarField] : undefined;
        const avatar = avatarValue ? (
          <Avatar
            src={typeof avatarValue === 'string' ? avatarValue : undefined}
            sx={{ width: 40, height: 40 }}
          >
            {typeof avatarValue === 'string' ? avatarValue.charAt(0).toUpperCase() : '?'}
          </Avatar>
        ) : undefined;

        // Metadata from specified fields
        const metadata = metadataFields.map(field => {
          const column = columns.find(col => col.field === field);
          if (!column || !row[field]) return null;

          const value = column.valueGetter ? column.valueGetter({ row }) : row[field];
          const displayValue = column.renderCell 
            ? column.renderCell({ value, row })
            : formatCellValue(value, column.type);

          return {
            label: column.headerName,
            value: displayValue
          };
        }).filter(Boolean);

        // Additional fields not in metadata but should be shown
        const additionalFields = columns
          .filter(col => 
            col.field !== primaryField && 
            col.field !== secondaryField && 
            col.field !== statusField &&
            col.field !== avatarField &&
            !metadataFields.includes(col.field) &&
            col.type !== 'actions' &&
            row[col.field] !== null &&
            row[col.field] !== undefined &&
            row[col.field] !== ''
          )
          .slice(0, 3) // Limit to prevent overcrowding
          .map(column => {
            const value = column.valueGetter ? column.valueGetter({ row }) : row[column.field];
            const displayValue = column.renderCell 
              ? column.renderCell({ value, row })
              : formatCellValue(value, column.type);

            return {
              label: column.headerName,
              value: displayValue
            };
          });

        const allMetadata = [...metadata, ...additionalFields];

        // Card actions
        const cardActions = actions.map(action => ({
          label: action.label,
          onClick: () => action.onClick(row),
          icon: action.icon,
          color: action.color || 'primary',
          variant: action.variant || 'outlined'
        }));

        return (
          <MobileCard
            key={row.id || index}
            title={title}
            subtitle={subtitle}
            status={status}
            metadata={allMetadata}
            actions={cardActions}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            showChevron={!!onRowClick && cardActions.length === 0}
            icon={avatar}
          />
        );
      })}
    </Stack>
  );
};

export default MobileDataGrid;