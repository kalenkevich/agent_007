// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Agent 007 website loaded successfully.');

    const copyBtn = document.getElementById('copy-btn');
    const formMessage = document.getElementById('form-message');

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const code = document.getElementById('install-code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                formMessage.style.color = '#10B981'; // Green
                formMessage.textContent = 'Copied to clipboard!';
                setTimeout(() => {
                    formMessage.textContent = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        });
    }

    // Add a subtle scroll effect to the header
    const header = document.getElementById('main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(11, 15, 25, 0.95)';
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        } else {
            header.style.background = 'rgba(11, 15, 25, 0.8)';
            header.style.boxShadow = 'none';
        }
    });
});
