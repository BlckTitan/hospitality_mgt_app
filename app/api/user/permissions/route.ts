import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { convex, api } from '../../../../lib/convex-client';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user roles from Convex
    const userRolesResult = await convex.query(api.userRoles.getUserRolesByUserId, {
      userId
    });

    if (!userRolesResult.success) {
      console.error('Failed to fetch user roles:', userRolesResult.message);
      return NextResponse.json(
        { error: 'Failed to fetch user permissions' },
        { status: 500 }
      );
    }

    const userRoles = userRolesResult.data;
    
    // Extract role names and property IDs
    const roles = userRoles.map(userRole => userRole.roleName);
    const propertyIds = [...new Set(userRoles.map(userRole => userRole.propertyId))];
    
    // Get role permissions for all user roles
    const rolePermissions = await Promise.all(
      roles.map(async (roleName) => {
        const role = await convex.query(api.roles.getRoleByName, {
          name: roleName
        });
        return role?.data?.permissions || {};
      })
    );

    // Merge permissions from all roles
    const mergedPermissions = rolePermissions.reduce((acc, permissions) => {
      return { ...acc, ...permissions };
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        userId,
        roles,
        propertyIds,
        permissions: mergedPermissions,
        customPermissions: mergedPermissions
      }
    });

  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
