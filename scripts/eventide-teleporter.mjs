/**
 * Eventide Teleporter Module for Foundry VTT v13
 * Provides quick teleportation functionality for GMs with three modes:
 * - Off: Disabled
 * - Slow: Hold key + click to teleport (green)
 * - Fast: Instant teleport on keypress (red)
 * 
 * @author Miles Eventide (Dalton Sterritt)
 */
class EventideTeleporter {
    /** @type {string} Module identifier */
    static MODULE_ID = 'eventide-teleporter';
    
    /** @type {string} Keybinding identifier */
    static KEYBIND_ID = 'teleport-tokens';
    
    /** @type {string} Scene control button identifier */
    static CONTROL_ID = 'eventide-teleporter-control';

    /** @type {boolean} Debug mode flag */
    static DEBUG = false;
    
    /** @type {string} Current teleporter mode: 'off', 'slow', 'fast' */
    static mode = 'off';
    
    /** @type {Function|null} Stored click handler for slow mode */
    static slowModeClickHandler = null;
    
    /**
     * Check if teleporter is enabled (not in 'off' mode)
     * @returns {boolean} True if enabled
     */
    static get isEnabled() {
        return this.mode !== 'off';
    }

    // ========================================
    // INITIALIZATION METHODS
    // ========================================

    /**
     * Initialize the module - called on 'init' hook
     */
    static init() {
        if (this.DEBUG) console.log('Eventide Teleporter | Initializing module');
        
        this.registerKeybinding();
        this.registerSettings();
        this.registerHooks();
    }

    /**
     * Setup the module after Foundry is ready - called on 'ready' hook
     */
    static ready() {
        if (this.DEBUG) console.log('Eventide Teleporter | Module ready');
        
        // Initialize the mode from settings
        this.mode = game.settings.get(this.MODULE_ID, 'mode');
        if (this.DEBUG) console.log('Eventide Teleporter | Mode:', this.mode);
    }

    /**
     * Register all necessary hooks
     */
    static registerHooks() {
        // Register scene controls hook
        Hooks.on('getSceneControlButtons', this.getSceneControlButtons.bind(this));
        
        // Register hook to apply styling after controls render
        Hooks.on('renderSceneControls', () => {
            this.applyButtonStyling();
        });
        
        if (this.DEBUG) console.log('Eventide Teleporter | Registered hooks');
    }

    // ========================================
    // REGISTRATION METHODS
    // ========================================

    /**
     * Register the keybinding for teleportation
     */
    static registerKeybinding() {
        game.keybindings.register(this.MODULE_ID, this.KEYBIND_ID, {
            name: 'EVENTIDE_TELEPORTER.Keybind.TeleportTokens',
            hint: 'EVENTIDE_TELEPORTER.Keybind.TeleportTokensHint',
            editable: [{ key: 'KeyM' }],
            onDown: (context) => {
                if (this.mode === 'fast') {
                    this.handleTeleportKeybind();
                } else if (this.mode === 'slow') {
                    this.setupSlowModeListener();
                }
                return true;
            },
            onUp: (context) => {
                if (this.mode === 'slow') {
                    this.cleanupSlowModeListener();
                }
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
        game.settings.register(this.MODULE_ID, 'mode', {
            name: 'EVENTIDE_TELEPORTER.Settings.Mode',
            hint: 'EVENTIDE_TELEPORTER.Settings.ModeHint',
            scope: 'client',
            restricted: true,
            config: true,
            type: String,
            choices: {
                'off': 'EVENTIDE_TELEPORTER.Settings.ModeOff',
                'slow': 'EVENTIDE_TELEPORTER.Settings.ModeSlow',
                'fast': 'EVENTIDE_TELEPORTER.Settings.ModeFast'
            },
            default: 'slow',
            onChange: (value) => {
                // Prevent recursion by only updating if value actually changed
                if (this.mode !== value) {
                    this.mode = value;
                    this.updateControlButton();
                }
            }
        });

        game.settings.register(this.MODULE_ID, 'snapToGrid', {
            name: 'EVENTIDE_TELEPORTER.Settings.SnapToGrid',
            hint: 'EVENTIDE_TELEPORTER.Settings.SnapToGridHint',
            scope: 'client',
            restricted: true,
            config: true,
            type: Boolean,
            default: true,
        });
    }

    // ========================================
    // SCENE CONTROL METHODS
    // ========================================

    /**
     * Add scene control button to token controls
     * @param {Object} controls - Scene controls object
     */
    static getSceneControlButtons(controls) {
        if (this.DEBUG) {
            console.log('Eventide Teleporter | getSceneControlButtons called');
            console.log('Eventide Teleporter | User is GM:', game.user.isGM);
        }
        
        if (!game.user.isGM) return;

        // Add our tool to the token controls
        if (controls.tokens) {
            const buttonData = this.getControlButtonData();
            controls.tokens.tools[this.CONTROL_ID] = {
                name: this.CONTROL_ID,
                title: buttonData.title,
                icon: buttonData.icon,
                button: true,
                onChange: () => this.cycleMode()
            };
            
            if (this.DEBUG) console.log('Eventide Teleporter | Added scene control button');
        }
    }

    /**
     * Get control button data based on current mode
     * @returns {Object} Button configuration object
     */
    static getControlButtonData() {
        const configs = {
            slow: {
                title: 'EVENTIDE_TELEPORTER.Controls.ModeSlow',
                icon: 'fas fa-feather-pointed',
                color: '#00ff00' // Green
            },
            fast: {
                title: 'EVENTIDE_TELEPORTER.Controls.ModeFast',
                icon: 'fas fa-feather-pointed',
                color: '#ff0000' // Red
            },
            off: {
                title: 'EVENTIDE_TELEPORTER.Controls.ModeOff',
                icon: 'fas fa-feather-pointed',
                color: '#666666' // Gray
            }
        };
        
        return configs[this.mode] || configs.off;
    }

    /**
     * Cycle through the three modes: off -> slow -> fast -> off
     */
    static cycleMode() {
        const modes = ['off', 'slow', 'fast'];
        const currentIndex = modes.indexOf(this.mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        const newMode = modes[nextIndex];
        
        if (this.DEBUG) {
            console.log('Eventide Teleporter | Cycling from', this.mode, 'to', newMode);
        }
        
        // Update the mode
        this.mode = newMode;
        
        // Save to settings
        game.settings.set(this.MODULE_ID, 'mode', newMode);
        
        // Show notification
        const modeKey = `EVENTIDE_TELEPORTER.Notifications.Mode${newMode.charAt(0).toUpperCase() + newMode.slice(1)}`;
        ui.notifications.info(game.i18n.localize(modeKey));
        
        // Update button state
        this.updateControlButton();
    }

    /**
     * Update the control button state and appearance
     */
    static updateControlButton() {
        // Update the control tool data
        const tokenControls = ui.controls.controls.tokens;
        if (tokenControls && tokenControls.tools[this.CONTROL_ID]) {
            const buttonData = this.getControlButtonData();
            const tool = tokenControls.tools[this.CONTROL_ID];
            
            tool.title = buttonData.title;
            tool.icon = buttonData.icon;
            
            if (this.DEBUG) {
                console.log('Eventide Teleporter | Updated control tool data:', {
                    mode: this.mode,
                    title: buttonData.title,
                    enabled: this.isEnabled
                });
            }
        }
        
        // Force re-render and apply styling
        ui.controls.render();
        this.applyButtonStyling();
    }

    /**
     * Apply programmatic styling to the control button
     */
    static applyButtonStyling() {
        requestAnimationFrame(() => {
            const button = document.querySelector(`[data-tool="${this.CONTROL_ID}"]`);
            if (!button) {
                if (this.DEBUG) console.log('Eventide Teleporter | Button not found for styling');
                return;
            }

            const buttonData = this.getControlButtonData();
            
            // Apply active class for enabled modes
            button.classList.toggle('active', this.isEnabled);
            
            // Apply programmatic styling
            button.style.color = buttonData.color;
            button.style.backgroundColor = this.isEnabled 
                ? this.hexToRgba(buttonData.color, 0.2) 
                : '';
            
            // Update tooltip
            button.setAttribute('title', game.i18n.localize(buttonData.title));
            
            if (this.DEBUG) {
                console.log('Eventide Teleporter | Applied styling for mode:', this.mode);
                console.log('Eventide Teleporter | Applied color:', buttonData.color);
            }
        });
    }

    // ========================================
    // TELEPORTATION METHODS
    // ========================================

    /**
     * Handle the teleport keybind activation
     * @param {Event} event - The triggering event
     */
    static handleTeleportKeybind(event) {
        // Validation checks
        if (!game.user.isGM) {
            ui.notifications.warn(game.i18n.localize('EVENTIDE_TELEPORTER.Warnings.GMOnly'));
            return;
        }

        if (!this.isEnabled) {
            ui.notifications.warn(game.i18n.localize('EVENTIDE_TELEPORTER.Warnings.NotEnabled'));
            return;
        }

        const selectedTokens = canvas.tokens.controlled;
        if (selectedTokens.length === 0) {
            ui.notifications.warn(game.i18n.localize('EVENTIDE_TELEPORTER.Warnings.NoTokensSelected'));
            return;
        }

        // Get and snap mouse position
        const worldPos = this.snapToGrid(canvas.mousePosition);
        
        if (this.DEBUG) {
            console.log('Eventide Teleporter | Teleporting', selectedTokens.length, 'tokens to', worldPos);
        }

        this.teleportTokens(selectedTokens, worldPos);
    }

    /**
     * Teleport tokens to the specified position
     * @param {Token[]} tokens - Array of tokens to teleport
     * @param {Object} position - Target position {x, y}
     */
    static async teleportTokens(tokens, position) {
        try {
            if (this.DEBUG) {
                console.log('Eventide Teleporter | Starting teleportation to position:', position);
            }
            
            const originalSettings = new Map();
            const gridSize = canvas.grid.size;
            
            // Process each token
            for (const token of tokens) {
                // Store original movement action
                originalSettings.set(token.id, {
                    movementAction: token.document.movementAction
                });
                
                // Set to teleport movement action
                await token.document.update({ movementAction: 'blink' });
                
                // Calculate centered position
                const tokenWidth = token.document.width * gridSize;
                const tokenHeight = token.document.height * gridSize;
                const newX = position.x - (tokenWidth / 2);
                const newY = position.y - (tokenHeight / 2);
                
                if (this.DEBUG) {
                    console.log(`Eventide Teleporter | Moving ${token.name} to (${newX}, ${newY})`);
                }
                
                // Perform the move
                await token.document.move({ x: newX, y: newY }, {
                    constrainOptions: { ignoreWalls: true }
                });
            }
            
            // Restore original movement actions
            for (const token of tokens) {
                const originalData = originalSettings.get(token.id);
                if (originalData) {
                    await token.document.update({
                        movementAction: originalData.movementAction
                    });
                }
            }
            
            // Success notification
            ui.notifications.info(
                game.i18n.format('EVENTIDE_TELEPORTER.Notifications.TokensTeleported', {
                    count: tokens.length
                })
            );

            if (this.DEBUG) console.log('Eventide Teleporter | Teleportation completed successfully');

        } catch (error) {
            console.error('Eventide Teleporter | Error during teleportation:', error);
            ui.notifications.error(game.i18n.localize('EVENTIDE_TELEPORTER.Errors.TeleportFailed'));
        }
    }

    // ========================================
    // SLOW MODE METHODS
    // ========================================

    /**
     * Set up click listener for slow mode
     */
    static setupSlowModeListener() {
        if (!game.user.isGM || !this.isEnabled) return;
        
        ui.notifications.info(game.i18n.localize('EVENTIDE_TELEPORTER.Notifications.SlowModeInstruction'));
        
        this.slowModeClickHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.handleTeleportKeybind(event);
            return false;
        };
        
        canvas.stage.on('click', this.slowModeClickHandler);
    }

    /**
     * Clean up slow mode click listener
     */
    static cleanupSlowModeListener() {
        if (this.slowModeClickHandler) {
            canvas.stage.off('click', this.slowModeClickHandler);
            this.slowModeClickHandler = null;
        }
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Snap position to the center of the grid cell under the cursor.
     * @param {Object} position - Position to snap {x, y}
     * @returns {Object} Snapped position {x, y}
     */
    static snapToGrid(position) {
        if (!canvas.grid || canvas.grid.type === CONST.GRID_TYPES.GRIDLESS || !game.settings.get(this.MODULE_ID, 'snapToGrid')) {
            return position;
        }

        return canvas.grid.getCenterPoint(position);
    }

    /**
     * Convert hex color to rgba string
     * @param {string} hex - Hex color string (e.g., '#ff0000')
     * @param {number} alpha - Alpha value (0-1)
     * @returns {string} RGBA color string
     */
    static hexToRgba(hex, alpha) {
        const cleanHex = hex.replace('#', '');
        const r = parseInt(cleanHex.substr(0, 2), 16);
        const g = parseInt(cleanHex.substr(2, 2), 16);
        const b = parseInt(cleanHex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

// ========================================
// MODULE INITIALIZATION
// ========================================

Hooks.once('init', () => {
    EventideTeleporter.init();
});

Hooks.once('ready', () => {
    EventideTeleporter.ready();
}); 