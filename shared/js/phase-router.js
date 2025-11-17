// Phase Router - Handles navigation between phases

const PhaseRouter = {
    currentPhase: 1,
    
    init() {
        // Set initial phase based on URL
        const path = window.location.pathname;
        const phaseMatch = path.match(/\/phase(\d)/);
        
        if (phaseMatch) {
            this.currentPhase = parseInt(phaseMatch[1]);
        }
        
        // Load the current phase
        this.loadPhase(this.currentPhase);
        
        // Setup navigation click handlers
        this.setupNavigation();
        
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.phase) {
                this.loadPhase(e.state.phase, false);
            }
        });
    },
    
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const phase = parseInt(item.dataset.phase);
                
                // Check if phase is disabled
                if (item.classList.contains('disabled')) {
                    alert('Please complete the previous phases first.');
                    return;
                }
                
                this.navigateToPhase(phase);
            });
        });
    },
    
    navigateToPhase(phase) {
        // Update URL
        const url = `/phase${phase}`;
        history.pushState({ phase }, '', url);
        
        // Load phase content
        this.loadPhase(phase);
    },
    
    async loadPhase(phase, updateHistory = true) {
        this.currentPhase = phase;
        
        // Update navigation active state
        this.updateNavigation();
        
        // Update breadcrumb
        this.updateBreadcrumb(phase);
        
        // Load phase-specific content
        const phaseContent = document.getElementById('phaseContent');
        
        try {
            const response = await fetch(`/api/phase${phase}/content`);
            const html = await response.text();
            phaseContent.innerHTML = html;
            
            // Load phase-specific JavaScript
            this.loadPhaseScript(phase);
            
        } catch (error) {
            console.error('Error loading phase content:', error);
            phaseContent.innerHTML = '<p>Error loading phase content.</p>';
        }
    },
    
    updateNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const itemPhase = parseInt(item.dataset.phase);
            
            // Remove active class from all
            item.classList.remove('active');
            
            // Add active to current phase
            if (itemPhase === this.currentPhase) {
                item.classList.add('active');
            }
            
            // Enable/disable phases (for now, enable all for manual navigation)
            // You can add logic here to disable phases based on completion status
        });
    },
    
    updateBreadcrumb(phase) {
        const breadcrumb = document.getElementById('breadcrumbCurrent');
        const phaseNames = {
            1: 'Phase 1: Upload & Profiling',
            2: 'Phase 2: Analysis',
            3: 'Phase 3: AI Remediation',
            4: 'Phase 4: Export'
        };
        breadcrumb.textContent = phaseNames[phase] || 'Unknown Phase';
    },
    
    loadPhaseScript(phase) {
        // Remove previous phase script if exists
        const existingScript = document.getElementById('phase-script');
        if (existingScript) {
            existingScript.remove();
        }
        
        // Load new phase script
        const script = document.createElement('script');
        script.id = 'phase-script';
        script.src = `/shared/js/phase${phase}.js`;
        script.onerror = () => {
            console.log(`No specific script for phase ${phase}`);
        };
        document.body.appendChild(script);
    }
};

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    PhaseRouter.init();
});
