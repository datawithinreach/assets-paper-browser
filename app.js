document.addEventListener('DOMContentLoaded', () => {
    let papers = [];
    let activeYearFilter = 'all';
    let activeTopicFilters = [];
    let showBookmarksOnly = false;
    
    // Load Bookmarks and Custom Tags from localStorage
    let bookmarks = JSON.parse(localStorage.getItem('assets_bookmarks') || '[]');
    let customTags = JSON.parse(localStorage.getItem('assets_custom_tags') || '{}');
    let deletedPresetTags = JSON.parse(localStorage.getItem('assets_deleted_presets') || '{}');
    
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const yearFiltersContainer = document.getElementById('year-filters');
    const topicFiltersContainer = document.getElementById('topic-filters');
    const bookmarkFilterBtn = document.getElementById('bookmark-filter-btn');
    const sortSelect = document.getElementById('sort-select');
    const resultsCount = document.getElementById('results-count');
    const papersGrid = document.getElementById('papers-grid');
    
    // Stats elements
    const statTotal = document.querySelector('#stat-total .stat-value');
    const stat2023 = document.querySelector('#stat-2023 .stat-value');
    const stat2024 = document.querySelector('#stat-2024 .stat-value');
    const stat2025 = document.querySelector('#stat-2025 .stat-value');

    // Fetch and load data
    fetch('papers.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch papers.json');
            }
            return response.json();
        })
        .then(data => {
            papers = data;
            initializeDashboard();
        })
        .catch(error => {
            console.error('Error loading papers:', error);
            papersGrid.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3>Failed to load papers</h3>
                    <p>${error.message}. Please make sure you are running a local web server.</p>
                </div>
            `;
        });

    function initializeDashboard() {
        updateStats();
        updateBookmarkCountDisplay();
        
        // Setup event listeners
        searchInput.addEventListener('input', handleSearchInput);
        clearSearchBtn.addEventListener('click', clearSearch);
        yearFiltersContainer.addEventListener('click', handleYearFilter);
        topicFiltersContainer.addEventListener('click', handleTopicFilter);
        bookmarkFilterBtn.addEventListener('click', handleBookmarkFilterToggle);
        sortSelect.addEventListener('change', renderPapers);
        
        // Initial render
        renderPapers();
    }

    function updateStats() {
        const counts = { total: papers.length, 2023: 0, 2024: 0, 2025: 0 };
        
        papers.forEach(paper => {
            if (counts[paper.Year] !== undefined) {
                counts[paper.Year]++;
            }
        });
        
        animateValue(statTotal, 0, counts.total, 800);
        animateValue(stat2023, 0, counts['2023'], 800);
        animateValue(stat2024, 0, counts['2024'], 800);
        animateValue(stat2025, 0, counts['2025'], 800);
    }

    function updateBookmarkCountDisplay() {
        bookmarkFilterBtn.textContent = `Bookmarked Only (${bookmarks.length})`;
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function handleSearchInput() {
        if (searchInput.value.trim() !== '') {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        renderPapers();
    }

    function clearSearch() {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderPapers();
    }

    function handleYearFilter(e) {
        const targetButton = e.target.closest('.pill');
        if (!targetButton) return;
        
        yearFiltersContainer.querySelectorAll('.pill').forEach(btn => btn.classList.remove('active'));
        targetButton.classList.add('active');
        
        activeYearFilter = targetButton.dataset.year;
        renderPapers();
    }

    function handleTopicFilter(e) {
        const targetButton = e.target.closest('.pill');
        if (!targetButton) return;
        
        const topic = targetButton.dataset.topic;
        
        if (topic === 'all') {
            activeTopicFilters = [];
            topicFiltersContainer.querySelectorAll('.pill').forEach(btn => btn.classList.remove('active'));
            targetButton.classList.add('active');
        } else {
            // Remove 'active' from 'All Topics'
            const allBtn = topicFiltersContainer.querySelector('[data-topic="all"]');
            allBtn.classList.remove('active');
            
            const index = activeTopicFilters.indexOf(topic);
            if (index === -1) {
                activeTopicFilters.push(topic);
                targetButton.classList.add('active');
            } else {
                activeTopicFilters.splice(index, 1);
                targetButton.classList.remove('active');
            }
            
            // If nothing is selected, revert to 'All Topics'
            if (activeTopicFilters.length === 0) {
                allBtn.classList.add('active');
            }
        }
        
        renderPapers();
    }

    function handleBookmarkFilterToggle() {
        showBookmarksOnly = !showBookmarksOnly;
        if (showBookmarksOnly) {
            bookmarkFilterBtn.classList.add('active');
        } else {
            bookmarkFilterBtn.classList.remove('active');
        }
        renderPapers();
    }

    // Get combined tags for a paper (preset + custom - deleted presets)
    function getPaperTags(paper) {
        const key = paper['DBLP Key'];
        
        // Start with preset tags from JSON
        let tags = [];
        if (paper.Tags) {
            tags = paper.Tags.split(';').map(t => t.trim()).filter(t => t !== '');
        }
        
        // Remove any deleted presets
        const deletedForPaper = deletedPresetTags[key] || [];
        tags = tags.filter(t => !deletedForPaper.includes(t));
        
        // Add custom tags
        const customForPaper = customTags[key] || [];
        customForPaper.forEach(tag => {
            if (!tags.includes(tag)) {
                tags.push(tag);
            }
        });
        
        return tags;
    }

    function getFilteredPapers() {
        const query = searchInput.value.toLowerCase().trim();
        
        return papers.filter(paper => {
            // Bookmark filter
            if (showBookmarksOnly && !bookmarks.includes(paper['DBLP Key'])) {
                return false;
            }

            // Year filter
            if (activeYearFilter !== 'all' && paper.Year.toString() !== activeYearFilter) {
                return false;
            }
            
            // Tag / Topic filter
            const combinedTags = getPaperTags(paper);
            if (activeTopicFilters.length > 0) {
                const hasAll = activeTopicFilters.every(filter => combinedTags.includes(filter));
                if (!hasAll) {
                    return false;
                }
            }
            
            // Search query filter
            if (query !== '') {
                const matchesTitle = paper.Title.toLowerCase().includes(query);
                const matchesAuthors = paper.Authors.toLowerCase().includes(query);
                const matchesDoi = paper.DOI.toLowerCase().includes(query);
                const matchesTags = combinedTags.some(t => t.toLowerCase().includes(query));
                return matchesTitle || matchesAuthors || matchesDoi || matchesTags;
            }
            
            return true;
        });
    }

    function sortPapers(filteredList) {
        const sortBy = sortSelect.value;
        const list = [...filteredList];
        
        if (sortBy === 'title-asc') {
            return list.sort((a, b) => a.Title.localeCompare(b.Title));
        } else if (sortBy === 'title-desc') {
            return list.sort((a, b) => b.Title.localeCompare(a.Title));
        } else if (sortBy === 'year-desc') {
            return list.sort((a, b) => b.Year - a.Year);
        } else if (sortBy === 'year-asc') {
            return list.sort((a, b) => a.Year - b.Year);
        }
        
        return list; // 'default' order
    }

    function renderPapers() {
        const filtered = getFilteredPapers();
        const sorted = sortPapers(filtered);
        
        resultsCount.textContent = `Showing ${sorted.length} paper${sorted.length === 1 ? '' : 's'}`;
        
        if (sorted.length === 0) {
            papersGrid.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3>No papers found</h3>
                    <p>Try adjusting your search terms or filters.</p>
                </div>
            `;
            return;
        }
        
        papersGrid.innerHTML = sorted.map((paper, idx) => {
            const authorList = paper.Authors ? paper.Authors.split(';').map(a => a.trim()).join(', ') : 'Unknown Authors';
            const doiUrl = paper.DOI ? `https://doi.org/${paper.DOI}` : paper.URL;
            const isBookmarked = bookmarks.includes(paper['DBLP Key']);
            const tags = getPaperTags(paper);
            
            // Generate tag badges HTML with inline delete cross
            const tagsHtml = tags.map(tag => {
                let extraClass = '';
                if (tag === 'Data Science') extraClass = 'tag-viz';
                else if (tag === 'Generative AI') extraClass = 'tag-genai';
                return `
                    <span class="tag-badge ${extraClass}">
                        ${escapeHTML(tag)}
                        <span class="tag-delete-btn" onclick="removeTagInline(event, '${escapeJS(paper['DBLP Key'])}', '${escapeJS(tag)}')" role="button" aria-label="Delete tag">&times;</span>
                    </span>
                `;
            }).join('');
            
            return `
                <div class="paper-card" style="animation: fadeInUp 0.4s ease forwards; animation-delay: ${Math.min(idx * 0.03, 0.5)}s; opacity: 0; transform: translateY(15px);">
                    <button class="bookmark-card-btn ${isBookmarked ? 'bookmarked' : ''}" 
                            onclick="toggleBookmark('${escapeJS(paper['DBLP Key'])}')" 
                            aria-label="${isBookmarked ? 'Remove Bookmark' : 'Bookmark Paper'}">
                        <svg class="heart-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                        </svg>
                    </button>
                    
                    <div class="paper-meta">
                        <span class="year-tag">${paper.Year}</span>
                        ${paper.Pages ? `<span class="pages-tag">Pages: ${paper.Pages}</span>` : ''}
                    </div>
                    <h3 class="paper-title" style="padding-right: 2rem;">${escapeHTML(paper.Title)}</h3>
                    <p class="paper-authors">${escapeHTML(authorList)}</p>
                    
                    <!-- Tag List -->
                    ${tags.length > 0 ? `<div class="paper-tags-list">${tagsHtml}</div>` : ''}
                    
                    <div class="paper-actions">
                        ${doiUrl ? `<a href="${doiUrl}" target="_blank" rel="noopener" class="btn-link">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View Paper
                        </a>` : ''}
                        <button class="btn-link btn-secondary" onclick="copyCitation('${escapeJS(paper.Title)}', '${escapeJS(authorList)}', ${paper.Year}, '${escapeJS(paper.DOI)}')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copy Citation
                        </button>
                        <form class="inline-tag-form" onsubmit="handleAddTagInline(event, '${escapeJS(paper['DBLP Key'])}')">
                            <input type="text" class="tag-input-field" placeholder="Add tag..." aria-label="New tag name">
                            <button type="submit" class="btn-link btn-secondary btn-add-tag">
                                Add
                            </button>
                        </form>
                    </div>
                </div>
            `;
        }).join('');
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    function escapeJS(str) {
        if (!str) return '';
        return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
    }

    // Bookmarking logic
    window.toggleBookmark = function(dblpKey) {
        const index = bookmarks.indexOf(dblpKey);
        if (index === -1) {
            bookmarks.push(dblpKey);
            showToast('Added to bookmarks!');
        } else {
            bookmarks.splice(index, 1);
            showToast('Removed from bookmarks.');
        }
        
        localStorage.setItem('assets_bookmarks', JSON.stringify(bookmarks));
        updateBookmarkCountDisplay();
        renderPapers();
    };

    // Inline Tag Deletion
    window.removeTagInline = function(event, dblpKey, tagToRemove) {
        event.stopPropagation();
        
        const paper = papers.find(p => p['DBLP Key'] === dblpKey);
        if (!paper) return;
        
        // Check if it's a preset tag
        let presetTags = [];
        if (paper.Tags) {
            presetTags = paper.Tags.split(';').map(t => t.trim()).filter(t => t !== '');
        }
        
        if (presetTags.includes(tagToRemove)) {
            // Add to deleted presets
            if (!deletedPresetTags[dblpKey]) {
                deletedPresetTags[dblpKey] = [];
            }
            if (!deletedPresetTags[dblpKey].includes(tagToRemove)) {
                deletedPresetTags[dblpKey].push(tagToRemove);
            }
            localStorage.setItem('assets_deleted_presets', JSON.stringify(deletedPresetTags));
        } else {
            // Remove from custom tags
            if (customTags[dblpKey]) {
                const idx = customTags[dblpKey].indexOf(tagToRemove);
                if (idx !== -1) {
                    customTags[dblpKey].splice(idx, 1);
                }
                if (customTags[dblpKey].length === 0) {
                    delete customTags[dblpKey];
                }
                localStorage.setItem('assets_custom_tags', JSON.stringify(customTags));
            }
        }
        
        renderPapers();
        showToast('Tag removed.');
    };

    // Inline Tag Insertion
    window.handleAddTagInline = function(event, dblpKey) {
        event.preventDefault();
        const form = event.target;
        const input = form.querySelector('.tag-input-field');
        const newTag = input.value.trim();
        if (!newTag) return;
        
        const paper = papers.find(p => p['DBLP Key'] === dblpKey);
        if (!paper) return;
        
        // If it was a deleted preset tag, restore it
        if (deletedPresetTags[dblpKey]) {
            const idx = deletedPresetTags[dblpKey].indexOf(newTag);
            if (idx !== -1) {
                deletedPresetTags[dblpKey].splice(idx, 1);
                if (deletedPresetTags[dblpKey].length === 0) {
                    delete deletedPresetTags[dblpKey];
                }
                localStorage.setItem('assets_deleted_presets', JSON.stringify(deletedPresetTags));
                input.value = '';
                renderPapers();
                showToast('Tag added!');
                return;
            }
        }
        
        // Add to custom tags
        if (!customTags[dblpKey]) {
            customTags[dblpKey] = [];
        }
        
        if (!customTags[dblpKey].includes(newTag)) {
            customTags[dblpKey].push(newTag);
            localStorage.setItem('assets_custom_tags', JSON.stringify(customTags));
            showToast('Tag added!');
        } else {
            showToast('Tag already exists.');
        }
        
        input.value = '';
        renderPapers();
    };

    function showToast(message) {
        // Remove existing toast if any
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'toast-notification';
        notification.innerText = message;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('visible'), 50);
        setTimeout(() => {
            notification.classList.remove('visible');
            setTimeout(() => notification.remove(), 200);
        }, 2000);
    }

    // Citation copy utility
    window.copyCitation = function(title, authors, year, doi) {
        const citation = `${authors}. (${year}). ${title}. ${doi ? `https://doi.org/${doi}` : ''}`;
        
        navigator.clipboard.writeText(citation).then(() => {
            showToast('Citation copied to clipboard!');
        }).catch(err => {
            console.error('Could not copy citation:', err);
        });
    };
});

// CSS animation added via JS to keep styles.css clean
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes fadeInUp {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;
document.head.appendChild(styleSheet);
