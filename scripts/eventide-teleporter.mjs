/**
 * Eventide Teleporter Module for Foundry VTT v13
 * Provides quick teleportation functionality for GMs
 */

class EventideTeleporter {
    static MODULE_ID = 'eventide-teleporter';
    static KEYBIND_ID = 'teleport-tokens';
    static CONTROL_ID = 'eventide-teleporter-control';

    static DEBUG = false;
    
    static isEnabled = false;

    /**
     * Initialize the module
     */
    static init() {
        if (this.DEBUG) console.log('Eventide Teleporter | Initializing module');
        
        // Register keybinding
        this.registerKeybinding();
        
        // Register settings
        this.registerSettings();
        
        // Register the scene controls hook early
        Hooks.on('getSceneControlButtons', this.getSceneControlButtons.bind(this));
        if (this.DEBUG) console.log('Eventide Teleporter | Registered getSceneControlButtons hook in init');
    }

    /**
     * Setup the module after Foundry is ready
     */
    static ready() {
        if (this.DEBUG) console.log('Eventide Teleporter | Module ready');
        
        // Initialize the enabled state from settings
        this.isEnabled = game.settings.get(this.MODULE_ID, 'enabled');
        if (this.DEBUG) console.log('Eventide Teleporter | Enabled state:', this.isEnabled);
    }

    /**
     * Register the keybinding for teleportation
     */
    static registerKeybinding() {
        game.keybindings.register(this.MODULE_ID, this.KEYBIND_ID, {
            name: 'EVENTIDE_TELEPORTER.Keybind.TeleportTokens',
            hint: 'EVENTIDE_TELEPORTER.Keybind.TeleportTokensHint',
            editable: [
                {
                    key: 'KeyM'
                }
            ],
            onDown: () => {
                this.handleTeleportKeybind();
                return true;
            },
            restricted: true, // GM only
            precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
        });
    }

    /**
     * Register module settings
     */
    static registerSettings() {
        game.settings.register(this.MODULE_ID, 'enabled', {
            name: 'EVENTIDE_TELEPORTER.Settings.Enabled',
            hint: 'EVENTIDE_TELEPORTER.Settings.EnabledHint',
            scope: 'world',
            config: true,
            type: Boolean,
            default: false,
            onChange: (value) => {
                this.isEnabled = value;
                this.updateControlButton();
            }
        });
    }

    /**
     * Add scene control button
     */
    static getSceneControlButtons(controls) {
        if (this.DEBUG) {
            console.log('Eventide Teleporter | getSceneControlButtons called!');
            console.log('Eventide Teleporter | User is GM:', game.user.isGM);
            console.log('Eventide Teleporter | Controls object:', controls);
        }
        
        if (!game.user.isGM) return;

        // In v13, we need to add tools to existing control groups using the new structure
        // Add our tool to the token controls
        if (this.DEBUG) console.log('Eventide Teleporter | Adding scene control button');
        if (controls.tokens) {
            controls.tokens.tools[this.CONTROL_ID] = {
                name: this.CONTROL_ID,
                title: 'EVENTIDE_TELEPORTER.Controls.Toggle',
                icon: 'fas fa-magic',
                toggle: true,
                active: this.isEnabled,
                onChange: (event, active) => {
                    this.toggleEnabled(active);
                }
            };
        }
    }

    /**
     * Toggle the enabled state
     */
    static toggleEnabled(enabled) {
        this.isEnabled = enabled;
        game.settings.set(this.MODULE_ID, 'enabled', enabled);
        
        ui.notifications.info(
            enabled 
                ? game.i18n.localize('EVENTIDE_TELEPORTER.Notifications.Enabled')
                : game.i18n.localize('EVENTIDE_TELEPORTER.Notifications.Disabled')
        );
    }

    /**
     * Update the control button state
     */
    static updateControlButton() {
        // In v13, controls is now a record structure
        const tokenControls = ui.controls.controls.tokens;
        if (tokenControls && tokenControls.tools[this.CONTROL_ID]) {
            tokenControls.tools[this.CONTROL_ID].active = this.isEnabled;
            ui.controls.render();
        }
    }

    /**
     * Handle the teleport keybind
     */
    static handleTeleportKeybind() {
        // Early return if not GM
        if (!game.user.isGM) {
            ui.notifications.warn(game.i18n.localize('EVENTIDE_TELEPORTER.Warnings.GMOnly'));
            return;
        }

        // Early return if not enabled
        if (!this.isEnabled) {
            ui.notifications.warn(game.i18n.localize('EVENTIDE_TELEPORTER.Warnings.NotEnabled'));
            return;
        }

        // Get selected tokens
        const selectedTokens = canvas.tokens.controlled;
        if (selectedTokens.length === 0) {
            ui.notifications.warn(game.i18n.localize('EVENTIDE_TELEPORTER.Warnings.NoTokensSelected'));
            return;
        }

        // Get mouse position - canvas.mousePosition is already in canvas coordinates
        const worldPos = canvas.mousePosition;
        
        if (this.DEBUG) {
            console.log('Eventide Teleporter | Mouse position:', worldPos);
            console.log('Eventide Teleporter | Selected tokens:', selectedTokens.length);
        }

        this.teleportTokens(selectedTokens, worldPos);
    }

    /**
     * Teleport tokens to the specified position
     */
    static async teleportTokens(tokens, position) {
        try {
            if (this.DEBUG) {
                console.log('Eventide Teleporter | Starting teleportation to position:', position);
                console.log('Eventide Teleporter | Available movement actions:', CONFIG.Token?.movement?.actions);
            }
            
            // Store original settings for restoration
            const originalSettings = new Map();
            
            // Calculate the center position for token placement
            const gridSize = canvas.grid.size;
            
            // Process each token individually
            for (const token of tokens) {
                // Store original movement action
                originalSettings.set(token.id, {
                    movementAction: token.document.movementAction
                });
                
                if (this.DEBUG) console.log(`Eventide Teleporter | Original movement action for ${token.name}: ${token.document.movementAction}`);
                
                // Set token to teleport movement action first
                await token.document.update({
                    movementAction: 'blink'
                });
                if (this.DEBUG) console.log(`Eventide Teleporter | Set ${token.name} to teleport movement action`);
                
                // Calculate the top-left position for the token
                // Center the token on the mouse position
                const tokenWidth = token.document.width * gridSize;
                const tokenHeight = token.document.height * gridSize;
                
                const newX = position.x - (tokenWidth / 2);
                const newY = position.y - (tokenHeight / 2);
                
                if (this.DEBUG) console.log(`Eventide Teleporter | Moving token ${token.name} from (${token.document.x}, ${token.document.y}) to (${newX}, ${newY})`);
                
                // Create a teleport waypoint using the new v13 movement system
                const waypoint = {
                    x: newX,
                    y: newY,
                    elevation: token.document.elevation
                };
                
                if (this.DEBUG) console.log(`Eventide Teleporter | Waypoint for ${token.name}:`, waypoint);
                

                await token.document.move({
                    x: newX,
                    y: newY
                }, {
                    constrainOptions: {
                        ignoreWalls: true
                    },
                });
                
                if (this.DEBUG) console.log(`Eventide Teleporter | Successfully moved ${token.name}`);
            }
            
            // Restore original movement actions
            for (const token of tokens) {
                const originalData = originalSettings.get(token.id);
                if (originalData) {
                    await token.document.update({
                        movementAction: originalData.movementAction
                    });
                    if (this.DEBUG) console.log(`Eventide Teleporter | Restored ${token.name} movement action to ${originalData.movementAction}`);
                }
            }
            
            if (this.DEBUG) console.log('Eventide Teleporter | Teleportation completed successfully');

            ui.notifications.info(
                game.i18n.format('EVENTIDE_TELEPORTER.Notifications.TokensTeleported', {
                    count: tokens.length
                })
            );

        } catch (error) {
            console.error('Eventide Teleporter | Error during teleportation:', error);
            ui.notifications.error(game.i18n.localize('EVENTIDE_TELEPORTER.Errors.TeleportFailed'));
            
            // Log the error for debugging
            if (this.DEBUG) console.error('Eventide Teleporter | Teleportation failed, but no settings to restore');
        }
    }


}

// Initialize the module
Hooks.once('init', () => {
    EventideTeleporter.init();
});

Hooks.once('ready', () => {
    EventideTeleporter.ready();
}); 