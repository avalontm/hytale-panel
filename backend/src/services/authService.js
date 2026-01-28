import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import userService from './userService.js';
import settingsService from './settingsService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hytale-panel-secret-key-2026';

class AuthService {
    async login(username, password) {
        const user = await userService.findByUser(username);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        if (!user.active) {
            throw new Error('Account is deactivated');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        // Update login date
        await userService.updateLoginDate(user.id);

        const token = jwt.sign(
            { id: user.id, username: user.user, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            token,
            user: {
                id: user.id,
                user: user.user,
                // email: user.email,
                role: user.role
            }
        };
    }

    async setup(data) {
        try {
            console.log('[AuthService] Starting setup with data:', {
                hasUser: !!data.user,
                hasSettings: !!data.settings,
                userData: data.user ? { user: data.user.user } : null
            });

            const { user: userData, settings: settingsData } = data;

            // Validate input
            if (!userData) {
                throw new Error('User data is required');
            }

            if (!userData.user || !userData.password) {
                throw new Error('Username and password are required');
            }

            // Check if setup is needed
            const needsSetup = await userService.needsSetup();
            console.log('[AuthService] Needs setup:', needsSetup);

            if (!needsSetup) {
                throw new Error('Setup already completed');
            }

            // Save provided settings if any
            if (settingsData) {
                try {
                    console.log('[AuthService] Saving settings:', settingsData);
                    await settingsService.update(settingsData);
                    console.log('[AuthService] Settings saved successfully');
                } catch (settingsError) {
                    console.error('[AuthService] Failed to save settings during setup:', settingsError);
                    // Continue with user creation even if settings fail
                }
            }

            // Force first user to be admin
            console.log('[AuthService] Creating admin user');
            const newUser = await userService.create({
                ...userData,
                role: 'admin'
            });
            console.log('[AuthService] User created successfully:', { id: newUser.id, user: newUser.user });

            return newUser;
        } catch (error) {
            console.error('[AuthService] Setup error:', error.message);
            console.error('[AuthService] Stack trace:', error.stack);
            throw error;
        }
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return null;
        }
    }
}

export default new AuthService();