/**
 * Course Updater Utility
 * Updates course page content based on admin settings
 */

// Function to check for template updates and apply them immediately
function checkAndApplyTemplateUpdates() {
    const templatesLastUpdate = localStorage.getItem('cybertech_overview_templates_last_update');
    const coursesLastUpdate = localStorage.getItem('cybertech_admin_courses_last_update');
    const lastCheck = localStorage.getItem('cybertech_template_last_check') || '0';
    
    const currentTime = new Date().getTime();
    const shouldUpdate = (templatesLastUpdate && parseInt(templatesLastUpdate) > parseInt(lastCheck)) ||
                        (coursesLastUpdate && parseInt(coursesLastUpdate) > parseInt(lastCheck));
    
    if (shouldUpdate) {
        console.log('Template or course updates detected, refreshing content...');
        
        // Update the last check timestamp
        localStorage.setItem('cybertech_template_last_check', currentTime.toString());
        
        // Force refresh of template content
        refreshAllTemplateContent();
        
        // Force reload of course data from localStorage
        localStorage.removeItem('cybertech_courses_cache');
        
        return true;
    }
    
    return false;
}

// Function to ensure all courses have templates assigned
function ensureAllCoursesHaveTemplates() {
    console.log('Ensuring all courses have templates assigned...');
    
    // Get all courses
    const courses = JSON.parse(localStorage.getItem('cybertech_admin_courses') || '[]');
    if (courses.length === 0) {
        console.log('No courses found');
        return;
    }
    
    // Get all templates
    const templates = JSON.parse(localStorage.getItem('cybertech_overview_templates') || '[]');
    if (templates.length === 0) {
        console.log('No templates found');
        return;
    }
    
    // Get template assignments
    const templateAssignments = JSON.parse(localStorage.getItem('cybertech_course_template_assignments') || '{}');
    
    // Check if each course has a template assigned
    courses.forEach(course => {
        // Skip if already assigned
        if (templateAssignments[course.id]) {
            console.log(`Course "${course.name}" already has template assigned: ${templateAssignments[course.id]}`);
            return;
        }
        
        console.log(`Finding template for course: ${course.name}`);
        
        // Try to find a matching template by name
        let matchingTemplate = templates.find(template => {
            const templateName = template.name.toLowerCase();
            const courseName = course.name.toLowerCase();
            
            return templateName.includes(courseName) || courseName.includes(templateName);
        });
        
        // If no matching template found, use a default one
        if (!matchingTemplate && templates.length > 0) {
            console.log(`No matching template found for "${course.name}", using first available template`);
            matchingTemplate = templates[0];
        }
        
        // Assign the template
        if (matchingTemplate) {
            templateAssignments[course.id] = matchingTemplate.id;
            console.log(`Assigned template "${matchingTemplate.name}" to course "${course.name}"`);
        }
    });
    
    // Save the updated assignments
    localStorage.setItem('cybertech_course_template_assignments', JSON.stringify(templateAssignments));
    console.log('Template assignments updated');
    
    // Force update to make changes visible
    const updateTimestamp = new Date().getTime().toString();
    localStorage.setItem('cybertech_admin_courses_last_update', updateTimestamp);
    localStorage.setItem('cybertech_overview_templates_last_update', updateTimestamp);
}

// Function to refresh all template content on the page
function refreshAllTemplateContent() {
    // Get current course from page URL or context
    const currentPage = window.location.pathname.split('/').pop();
    let courseIdentifier = null;
    
    // Map page names to course identifiers
    const pageToIdentifier = {
        'course-phishing.html': 'phishing',
        'course-password-security.html': 'password security',
        'course-data-protection.html': 'data protection',
        'course-social-engineering.html': 'social engineering'
    };
    
    courseIdentifier = pageToIdentifier[currentPage];
    
    if (courseIdentifier) {
        console.log('Refreshing template content for:', courseIdentifier);
        
        // Update course content with admin settings
        const updatedCourse = updateCoursePageFromAdminSettings(courseIdentifier);
        
        // Apply templates if course was found
        if (updatedCourse) {
            updateCourseOverviewFromAssignedTemplate(updatedCourse);
        }
    }
}

function updateCoursePageFromAdminSettings(courseIdentifier) {
    if (!window.SettingsManager) return;
    
    // Check if certificate generation is enabled
    if (!window.SettingsManager.isFeatureEnabled('certificateGeneration')) {
        const certButtons = document.querySelectorAll('[href="certificate.html"], .btn-secondary');
        certButtons.forEach(btn => {
            if (btn.textContent.includes('Certificate')) {
                btn.style.display = 'none';
            }
        });
    }
    
    // Load course data from admin settings
    const courses = window.SettingsManager.getCourses();
    let targetCourse = null;
    
    // Find course by different methods
    if (typeof courseIdentifier === 'number') {
        // Find by ID
        targetCourse = courses.find(course => course.id === courseIdentifier);
    } else if (typeof courseIdentifier === 'string') {
        // Find by name keyword
        targetCourse = courses.find(course => 
            course.name.toLowerCase().includes(courseIdentifier.toLowerCase())
        );
    } else if (typeof courseIdentifier === 'function') {
        // Find by custom function
        targetCourse = courses.find(courseIdentifier);
    }
    
    if (targetCourse) {
        console.log('Updating course page with admin settings for:', targetCourse.name);
        
        // Update course title in header
        const titleElements = document.querySelectorAll('.course-header h1, #course-title');
        titleElements.forEach(element => {
            element.textContent = targetCourse.name;
        });
        
        // Update page title
        const titleElement = document.querySelector('title');
        if (titleElement) {
            const platformName = window.SettingsManager.getSetting('general', 'platformName', 'CyberTech');
            titleElement.textContent = `${targetCourse.name} Course | ${platformName}`;
        }
        
        // Update course description - but keep it separate from overview
        const descElements = document.querySelectorAll('.course-description, #main-course-description');
        descElements.forEach(element => {
            // ONLY use description for the course description elements, not overview
            if (targetCourse.description) {
                element.textContent = targetCourse.description;
                console.log('Updated course description with:', targetCourse.description);
            }
            // Do NOT use overview as fallback for description
        });
        
        // Update course overview text - but preserve static content for each course
        const overviewTextElement = document.getElementById('course-overview-text');
        if (overviewTextElement) {
            const currentPage = window.location.pathname.split('/').pop();
            
            // Preserve the static HTML content for all course pages
            // Each course page has its own specific content in the HTML
            console.log(`Preserving static overview text for course page: ${currentPage}`);
            
            // Don't change the text - let the static HTML content remain for all courses
            // This ensures each course shows its own correct overview
        }
        
        // Update course overview content from template
        updateCourseOverviewFromTemplate(targetCourse);
        
        // Check if there's a template assigned to this course and update overview accordingly
        updateCourseOverviewFromAssignedTemplate(targetCourse);
        
        // Update course metadata
        const metaElements = document.querySelectorAll('.course-meta span');
        metaElements.forEach(element => {
            if ((element.innerHTML.includes('hours') || element.id === 'course-duration') && targetCourse.duration) {
                element.innerHTML = `<i class="fas fa-clock"></i> ${targetCourse.duration} hours`;
            } else if ((element.innerHTML.includes('enrolled') || element.id === 'course-enrolled') && targetCourse.enrolled) {
                element.innerHTML = `<i class="fas fa-users"></i> ${targetCourse.enrolled.toLocaleString()} enrolled`;
            }
        });
        
        // Update difficulty badge
        if (targetCourse.difficulty) {
            const badges = document.querySelectorAll('.course-badge');
            badges.forEach(badge => {
                badge.className = `course-badge ${targetCourse.difficulty} small-badge`;
                badge.textContent = targetCourse.difficulty.charAt(0).toUpperCase() + targetCourse.difficulty.slice(1);
            });
        }
        
        // Update course image
        if (targetCourse.image) {
            // Update header image
            const headerImage = document.querySelector('.course-header-image img, .course-image img');
            if (headerImage) {
                headerImage.src = targetCourse.image;
                headerImage.alt = targetCourse.name;
            }
            
            // Update course background image if it exists
            const courseImageBg = document.querySelector('.course-image');
            if (courseImageBg) {
                courseImageBg.style.backgroundImage = `url('${targetCourse.image}')`;
            }
            
            // Update any other course images
            const courseImages = document.querySelectorAll('.course-thumbnail img');
            courseImages.forEach(img => {
                img.src = targetCourse.image;
                img.alt = targetCourse.name;
            });
        }
        
        // Update modules if they exist
        if (targetCourse.modules && targetCourse.modules.length > 0) {
            updateCourseModules(targetCourse.modules);
        }
        
        // Apply template content to the course
        updateCourseOverviewFromAssignedTemplate(targetCourse);
        
        // Log success
        console.log('Course page updated successfully with latest admin settings');
        
        return targetCourse;
    }
    
    return null;
}

function updateCourseOverviewFromTemplate(course) {
    // Check if course has template content
    if (course.templateContent) {
        // Update main course overview content
        const overviewContent = document.querySelector('#overview h2 + p');
        if (overviewContent) {
            overviewContent.textContent = course.templateContent;
        }
        
        // Update "What You Will Learn" section
        if (course.templateLearningObjectives && course.templateLearningObjectives.length > 0) {
            const learningList = document.querySelector('.course-features');
            if (learningList) {
                learningList.innerHTML = course.templateLearningObjectives.map(objective => `
                    <li>
                        <i class="fas fa-check-circle"></i>
                        <span>${objective}</span>
                    </li>
                `).join('');
            }
        }
        
        // Update "Course Requirements" section
        if (course.templateRequirements && course.templateRequirements.length > 0) {
            const requirementsList = document.querySelector('.requirements-list');
            if (requirementsList) {
                requirementsList.innerHTML = course.templateRequirements.map(requirement => `
                    <li>${requirement}</li>
                `).join('');
            }
        }
        
        // Update "Who This Course is For" section
        if (course.templateTargetAudience && course.templateTargetAudience.length > 0) {
            const audienceList = document.querySelector('.target-audience');
            if (audienceList) {
                audienceList.innerHTML = course.templateTargetAudience.map(audience => `
                    <li>${audience}</li>
                `).join('');
            }
        }
    }
}

function updateCourseOverviewFromAssignedTemplate(course) {
    try {
        // Always get fresh template data
        const currentTime = new Date().getTime();
        
        // Get template assignments
        const templateAssignments = JSON.parse(localStorage.getItem('cybertech_course_template_assignments') || '{}');
        const assignedTemplateId = templateAssignments[course.id];
        
        if (assignedTemplateId) {
            // Get templates (always fresh from localStorage)
            const templates = JSON.parse(localStorage.getItem('cybertech_overview_templates') || '[]');
            const assignedTemplate = templates.find(template => template.id == assignedTemplateId);
            
            if (assignedTemplate) {
                console.log('Applying assigned template:', assignedTemplate.name, 'with content:', assignedTemplate.content?.substring(0, 100) + '...');
                
                // Update course overview text with template content
                const overviewTextElement = document.getElementById('course-overview-text');
                if (overviewTextElement && assignedTemplate.content) {
                    // Actually update the overview text with template content
                    overviewTextElement.textContent = assignedTemplate.content;
                    overviewTextElement.setAttribute('data-last-updated', currentTime);
                    console.log('Updated course overview with template content');
                }
                
                // Update "What You Will Learn" section with template learning objectives
                const learningList = document.querySelector('.course-features');
                if (learningList && assignedTemplate.learningObjectives && assignedTemplate.learningObjectives.length > 0) {
                    learningList.innerHTML = assignedTemplate.learningObjectives.map(objective => `
                        <li>
                            <i class="fas fa-check-circle"></i>
                            <span>${objective}</span>
                        </li>
                    `).join('');
                    learningList.setAttribute('data-last-updated', currentTime);
                    console.log('Updated "What You Will Learn" with template learning objectives');
                }
                
                // Update "Course Requirements" section with template requirements
                const requirementsList = document.querySelector('.requirements-list');
                if (requirementsList && assignedTemplate.requirements && assignedTemplate.requirements.length > 0) {
                    requirementsList.innerHTML = assignedTemplate.requirements.map(requirement => `
                        <li>${requirement}</li>
                    `).join('');
                    requirementsList.setAttribute('data-last-updated', currentTime);
                    console.log('Updated "Course Requirements" with template requirements');
                }
                
                // Update "Who This Course is For" section with template target audience
                const audienceList = document.querySelector('.target-audience');
                if (audienceList && assignedTemplate.targetAudience && assignedTemplate.targetAudience.length > 0) {
                    audienceList.innerHTML = assignedTemplate.targetAudience.map(audience => `
                        <li>${audience}</li>
                    `).join('');
                    audienceList.setAttribute('data-last-updated', currentTime);
                    console.log('Updated "Who This Course is For" with template target audience');
                }
                
                // Add a small indicator to show content is from a template
                const sections = [
                    { element: overviewTextElement, label: "Course Overview" },
                    { element: document.querySelector('.course-features'), label: "Learning Objectives" },
                    { element: document.querySelector('.requirements-list'), label: "Requirements" },
                    { element: document.querySelector('.target-audience'), label: "Target Audience" }
                ];
                
                sections.forEach(section => {
                    if (section.element && !section.element.querySelector('.template-indicator')) {
                        const indicator = document.createElement('div');
                        indicator.className = 'template-indicator';
                        indicator.style.cssText = 'font-size: 11px; color: #6c757d; margin-top: 5px; font-style: italic;';
                        indicator.textContent = `${section.label} content managed by admin`;
                        section.element.appendChild(indicator);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error applying assigned template:', error);
    }
}

function updateCourseModules(modules) {
    console.log('Updating course modules with latest data:', modules);
    
    // Update module count in overview
    const moduleCountElements = document.querySelectorAll('.modules-count, .module-count');
    moduleCountElements.forEach(element => {
        element.textContent = modules.length;
    });
    
    // Update module list if present
    const moduleListElements = document.querySelectorAll('.modules-list, .module-list');
    moduleListElements.forEach(listElement => {
        listElement.innerHTML = modules.map(module => {
            // Generate lessons HTML if module has lessons
            const lessonsHTML = module.lessons ? module.lessons.map(lesson => `
                <div class="lesson-item">
                    <i class="fas fa-book-reader" style="color: #6f42c1; margin-right: 8px;"></i>
                    <span class="lesson-title">${lesson.title}</span>
                    <span class="lesson-duration">${lesson.duration}</span>
                </div>
            `).join('') : '';
            
            return `
                <div class="module-item">
                    <div class="module-header">
                        <i class="fas fa-play-circle"></i>
                        <span class="module-title">${module.title}</span>
                        <span class="module-duration">${module.duration}</span>
                    </div>
                    ${lessonsHTML ? `<div class="module-lessons" style="margin-left: 25px; margin-top: 8px;">${lessonsHTML}</div>` : ''}
                </div>
            `;
        }).join('');
    });
    
    // Update modules in course overview section
    const overviewModules = document.querySelector('.course-modules .modules-list');
    if (overviewModules) {
        overviewModules.innerHTML = modules.map(module => {
            // Generate lessons HTML for overview
            const lessonsHTML = module.lessons ? module.lessons.map(lesson => `
                <div class="lesson-list-item" style="padding-left: 20px; font-size: 0.9em;">• ${lesson.title} - ${lesson.duration}</div>
            `).join('') : '';
            
            return `
                <div class="module-list-item">
                    <div class="module-header">${module.title} - ${module.duration}</div>
                    ${lessonsHTML}
                </div>
            `;
        }).join('');
    }
    
    // Update all module headers in the curriculum section
    const moduleHeaders = document.querySelectorAll('.course-module .module-header');
    if (moduleHeaders && moduleHeaders.length > 0) {
        modules.forEach((module, index) => {
            if (index < moduleHeaders.length) {
                // Update module title
                const moduleTitleEl = moduleHeaders[index].querySelector('.module-title, h3');
                if (moduleTitleEl) {
                    // Keep "Module X:" prefix if it exists
                    const modulePrefix = moduleTitleEl.textContent.match(/Module \d+:/);
                    if (modulePrefix) {
                        moduleTitleEl.textContent = `${modulePrefix[0]} ${module.title.replace(/^Module \d+:\s*/, '')}`;
                    } else {
                        moduleTitleEl.textContent = module.title;
                    }
                }
                
                // Update module duration
                const moduleDurationEl = moduleHeaders[index].querySelector('.module-duration, .module-length span');
                if (moduleDurationEl) {
                    moduleDurationEl.textContent = module.duration;
                } else {
                    // If no specific duration span, update the whole module-length element
                    const moduleLengthEl = moduleHeaders[index].querySelector('.module-length');
                    if (moduleLengthEl) {
                        moduleLengthEl.innerHTML = `<i class="fas fa-clock"></i> <span class="module-duration">${module.duration}</span>`;
                    }
                }
            }
        });
    }
    
    // Update individual module sections in the content area
    const contentModules = document.querySelectorAll('.course-content-section .module-item');
    if (contentModules && contentModules.length > 0) {
        modules.forEach((module, index) => {
            if (index < contentModules.length) {
                const moduleTitle = contentModules[index].querySelector('.module-title');
                if (moduleTitle) {
                    moduleTitle.textContent = module.title;
                }
                const moduleDuration = contentModules[index].querySelector('.module-duration');
                if (moduleDuration) {
                    moduleDuration.textContent = module.duration;
                }
            }
        });
    }
    
    console.log('Updated all module information with latest admin changes');
}

// Function to directly apply templates without course data
function applyTemplatesDirectly() {
    try {
        // Get current page course info
        const currentPage = window.location.pathname.split('/').pop();
        let courseIdentifier = null;
        
        switch(currentPage) {
            case 'course-phishing.html':
                courseIdentifier = 'phishing';
                break;
            case 'course-password-security.html':
                courseIdentifier = 'password';
                break;
            case 'course-data-protection.html':
                courseIdentifier = 'data';
                break;
            case 'course-social-engineering.html':
                courseIdentifier = 'social';
                break;
        }
        
        if (!courseIdentifier) return;
        
        // Get courses and find current course
        const courses = JSON.parse(localStorage.getItem('cybertech_admin_courses') || '[]');
        const currentCourse = courses.find(course => 
            course.name.toLowerCase().includes(courseIdentifier) ||
            course.id.toString() === courseIdentifier
        );
        
        if (currentCourse) {
            console.log('Found course for template application:', currentCourse.name);
            
            // Get template assignments
            const templateAssignments = JSON.parse(localStorage.getItem('cybertech_course_template_assignments') || '{}');
            const assignedTemplateId = templateAssignments[currentCourse.id];
            
            if (assignedTemplateId) {
                // Get templates
                const templates = JSON.parse(localStorage.getItem('cybertech_overview_templates') || '[]');
                const assignedTemplate = templates.find(template => template.id == assignedTemplateId);
                
                if (assignedTemplate) {
                    console.log('Applying template directly:', assignedTemplate.name);
                    
                    // Preserve static overview text for all course pages
                    // Each course has its own specific content in the HTML
                    const overviewTextElement = document.getElementById('course-overview-text');
                    if (overviewTextElement) {
                        console.log(`Preserving static overview text for ${currentPage}`);
                        // Don't update the text - let each course keep its own content
                    }
                    
                    // Preserve course-specific content for all sections
                    console.log(`Preserving course-specific content sections for ${currentPage}`);
                    
                    // Do not update "What You Will Learn" section - preserve course-specific content
                    const learningList = document.querySelector('.course-features');
                    if (learningList) {
                        console.log('Preserving original "What You Will Learn" content');
                    }
                    
                    // Do not update "Course Requirements" section - preserve course-specific content
                    const requirementsList = document.querySelector('.requirements-list');
                    if (requirementsList) {
                        console.log('Preserving original "Course Requirements" content');
                    }
                    
                    // Do not update "Who This Course is For" section - preserve course-specific content
                    const audienceList = document.querySelector('.target-audience');
                    if (audienceList) {
                        console.log('Preserving original "Who This Course is For" content');
                    }
                    
                    console.log('Template application completed successfully');
                } else {
                    console.log('Template assigned but not found in templates list');
                }
            } else {
                console.log('No template assigned to this course');
            }
        } else {
            console.log('Course not found for template application');
        }
    } catch (error) {
        console.error('Error in direct template application:', error);
    }
}

// Function to show new video notifications
function showNewVideoNotification(count) {
    // Check if user is admin before showing notification
    if (typeof window.isAdminUser === 'function' && !window.isAdminUser()) {
        console.log('New video notification suppressed for regular user');
        return; // Don't show notifications to regular users
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'new-video-notification';
    notification.innerHTML = `
        <span><i class="fas fa-video"></i> ${count} new video(s) available!</span>
        <button class="close-btn">×</button>
    `;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #4CAF50;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        margin-left: 10px;
    `;
    closeBtn.addEventListener('click', () => notification.remove());
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Function to update lessons display in the current page
function updateLessonsDisplay() {
    console.log('Checking for lesson updates...');
    
    // Get current course
    const currentPage = window.location.pathname.split('/').pop();
    let courseIdentifier = null;
    
    const pageToIdentifier = {
        'course-phishing.html': 'phishing',
        'course-password-security.html': 'password security',
        'course-data-protection.html': 'data protection',
        'course-social-engineering.html': 'social engineering'
    };
    
    courseIdentifier = pageToIdentifier[currentPage];
    
    if (!courseIdentifier) return;
    
    // Get latest course data
    const courses = JSON.parse(localStorage.getItem('cybertech_admin_courses') || '[]');
    const currentCourse = courses.find(course => 
        course.name.toLowerCase().includes(courseIdentifier)
    );
    
    if (!currentCourse) return;
    
    console.log('Found current course:', currentCourse.name);
    
    // Find the Common Types of Phishing Attacks module
    const targetModule = currentCourse.modules.find(module => 
        module.title && (
            module.title.toLowerCase().includes('common types') || 
            module.title.toLowerCase().includes('phishing attack')
        )
    );
    
    if (!targetModule) {
        console.log('Target module not found');
        return;
    }
    
    if (!targetModule.lessons || targetModule.lessons.length === 0) {
        console.log('No lessons found in target module');
        return;
    }
    
    console.log('Found target module with lessons:', targetModule);
    
    // Find the module element in the page
    const moduleElements = document.querySelectorAll('.lesson-info, .lesson-expandable');
    let targetElement = null;
    
    for (const element of moduleElements) {
        if (element.textContent.toLowerCase().includes('common types')) {
            targetElement = element;
            break;
        }
    }
    
    if (!targetElement) {
        console.log('Could not find target element in the page');
        return;
    }
    
    console.log('Found target element:', targetElement);
    
    // Find expanded content
    let expandedContent = targetElement.nextElementSibling;
    if (!expandedContent || !expandedContent.classList.contains('lesson-expanded-content')) {
        // If no expanded content, try to find it as a child of parent li
        const parentLi = targetElement.closest('li');
        if (parentLi) {
            expandedContent = parentLi.querySelector('.lesson-expanded-content');
        }
    }
    
    if (!expandedContent) {
        console.log('Could not find expanded content');
        return;
    }
    
    // Find phishing-types-container
    let phishingTypesContainer = expandedContent.querySelector('.phishing-types-container');
    if (!phishingTypesContainer) {
        console.log('Could not find phishing-types-container');
        return;
    }
    
    // Check if we need to add the new lesson
    const newLessons = targetModule.lessons.filter(lesson => {
        // Check if this lesson already exists in the container
        const existingLessons = Array.from(phishingTypesContainer.querySelectorAll('h4')).map(h => h.textContent.trim());
        return !existingLessons.some(existingTitle => existingTitle.includes(lesson.title));
    });
    
    if (newLessons.length === 0) {
        console.log('No new lessons to add');
        return;
    }
    
    console.log('Adding new lessons:', newLessons);
    
    // Add new lessons
    newLessons.forEach(lesson => {
        const lessonElement = document.createElement('div');
        lessonElement.className = 'phishing-type new-lesson';
        lessonElement.innerHTML = `
            <h4><i class="fas fa-laugh"></i> ${lesson.title}</h4>
            <p>New lesson added by admin.</p>
            <ul>
                <li>Added in real-time</li>
                <li>No page refresh needed</li>
            </ul>
            <span class="lesson-duration" style="display: block; text-align: right; font-style: italic; margin-top: 10px;">${lesson.duration}</span>
        `;
        
        // Add highlight animation
        lessonElement.style.animation = 'highlightNew 3s ease-out';
        lessonElement.style.border = '2px solid #28a745';
        lessonElement.style.borderRadius = '8px';
        lessonElement.style.padding = '15px';
        lessonElement.style.marginTop = '15px';
        
        phishingTypesContainer.appendChild(lessonElement);
    });
    
    // Make sure expanded content is visible
    expandedContent.style.display = 'block';
    
    // Add keyframes for animation if not already added
    if (!document.getElementById('highlight-keyframes')) {
        const style = document.createElement('style');
        style.id = 'highlight-keyframes';
        style.textContent = `
            @keyframes highlightNew {
                0% { background-color: #d4edda; }
                50% { background-color: #d4edda; }
                100% { background-color: #f8f9fa; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Show notification
    showUpdateNotification(`${newLessons.length} new lesson(s) added to Common Types of Phishing Attacks`);
}

// Function to show notification
function showUpdateNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'lesson-update-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 5px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 100);
    
    // Hide and remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Auto-update course pages based on URL
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    
    let courseIdentifier = null;
    
    // Determine course identifier based on page
    switch(currentPage) {
        case 'course-phishing':
            courseIdentifier = 'phishing';
            break;
        case 'course-password-security':
            courseIdentifier = 'password';
            break;
        case 'course-data-protection':
            courseIdentifier = 'data';
            break;
        case 'course-social-engineering':
            courseIdentifier = 'social';
            break;
        default:
            // Try to extract course identifier from page name
            if (currentPage.startsWith('course-')) {
                courseIdentifier = currentPage.replace('course-', '');
            }
    }
    
    // Force clear localStorage for courses to ensure fresh data
    if (courseIdentifier) {
        console.log('Clearing localStorage cache to ensure fresh course data');
        localStorage.removeItem('cybertech_admin_courses_last_update');
        
        // Also check for template updates
        const lastTemplateUpdate = localStorage.getItem('cybertech_overview_templates_last_update');
        const currentTime = new Date().getTime();
        if (!lastTemplateUpdate || (currentTime - parseInt(lastTemplateUpdate)) > 30000) {
            console.log('Checking for template updates...');
            // Force template refresh by clearing cache
            localStorage.removeItem('cybertech_overview_templates_cache');
        }
    }
    
    function updateCourseWithRetry(attempts = 0) {
        if (courseIdentifier) {
            // Wait for SettingsManager to be ready
            if (window.SettingsManager) {
                const result = updateCoursePageFromAdminSettings(courseIdentifier);
                if (result) {
                    console.log('Course page updated successfully with latest admin settings');
                    
                    // Also apply any assigned templates after a short delay
                    setTimeout(() => {
                        console.log('Applying course overview templates...');
                        updateCourseOverviewFromAssignedTemplate(result);
                    }, 100);
                } else if (attempts < 3) {
                    console.log(`Course update attempt ${attempts+1} failed, retrying...`);
                    setTimeout(() => updateCourseWithRetry(attempts + 1), 500);
                }
            } else if (attempts < 5) {
                // Wait for SettingsManager to load and retry
                console.log(`SettingsManager not ready, retrying (attempt ${attempts+1})...`);
                setTimeout(() => updateCourseWithRetry(attempts + 1), 300);
            }
        }
    }
    
    // Start update process with retry logic
    updateCourseWithRetry();
    
    // Ensure all courses have templates assigned
    ensureAllCoursesHaveTemplates();
    
    // Check for template updates immediately
    checkAndApplyTemplateUpdates();
    
    // Also add a direct template application check
    setTimeout(() => {
        console.log('Final check: Applying any assigned templates...');
        applyTemplatesDirectly();
        
        // Check for updates again after initial load
        checkAndApplyTemplateUpdates();
    }, 1000);
    
    // Set up periodic checking for template updates (every 5 seconds)
    setInterval(() => {
        if (checkAndApplyTemplateUpdates()) {
            console.log('Templates were updated - content refreshed');
        }
    }, 5000);
    
    // Listen for storage events to update immediately when admin makes changes
    window.addEventListener('storage', function(e) {
        if (e.key === 'cybertech_overview_templates_last_update' || 
            e.key === 'cybertech_admin_courses_last_update' ||
            e.key === 'cybertech_admin_courses' ||
            e.key === 'cybertech_course_changes') {
            
            console.log('Storage event detected - checking for updates immediately');
            
            // Check for template updates
            setTimeout(() => {
                if (checkAndApplyTemplateUpdates()) {
                    console.log('Immediate template update applied due to admin changes');
                }
                
                // Also check for lesson updates
                updateLessonsDisplay();
            }, 200);
        }
    });
    
    // Force initial lesson update
    setTimeout(updateLessonsDisplay, 1500);
});