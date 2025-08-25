// Direct Lesson Injector
// This script directly injects lessons added by admin into course modules
// and handles lesson editing and deletion

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Direct Lesson Injector loaded');
    
    // Add a temporary debug button to disable lesson injection
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const debugButton = document.createElement('button');
        debugButton.textContent = 'Toggle Lesson Injection';
        debugButton.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 10000; background: #007bff; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;';
        debugButton.onclick = function() {
            const isDisabled = localStorage.getItem('disable_lesson_injection') === 'true';
            localStorage.setItem('disable_lesson_injection', (!isDisabled).toString());
            debugButton.textContent = isDisabled ? 'Disable Lesson Injection' : 'Enable Lesson Injection';
            location.reload();
        };
        document.body.appendChild(debugButton);
    }
    
    // Add keyframes for animations if not already added
    if (!document.getElementById('lesson-animations')) {
        const style = document.createElement('style');
        style.id = 'lesson-animations';
        style.textContent = `
            @keyframes highlightNew {
                0% { background-color: #d4edda; }
                50% { background-color: #d4edda; }
                100% { background-color: #f8fff8; }
            }
            @keyframes fadeOut {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Wait a bit for the page to fully render
    setTimeout(() => {
        injectAllLessons();
        
        // Force update all modules consistently
        forceUpdateAllModules();
    }, 500);
    
    // Listen for storage events to update immediately when admin makes changes
window.addEventListener('storage', function(e) {
    if (e.key === 'cybertech_admin_courses' || 
        e.key === 'cybertech_admin_courses_last_update' ||
        e.key === 'cybertech_course_changes') {
        console.log('Storage event detected - checking for lesson updates');
        
        // Add a small delay to ensure the DOM is ready
        setTimeout(() => {
            // Force refresh all lesson displays first
            forceRefreshAllLessons();
            
            // Then check for updates to existing lessons and add new ones
            injectAllLessons();
                
                // Force update all modules consistently
                forceUpdateAllModules();
            
            // Force refresh of the course curriculum display
            const curriculumSection = document.querySelector('.course-curriculum');
            if (curriculumSection) {
                curriculumSection.style.opacity = '0.5';
                setTimeout(() => {
                    curriculumSection.style.opacity = '1';
                    // Run another refresh after animation completes
                    forceRefreshAllLessons();
                }, 300);
            }
        }, 100);
    }
});
    
    // Also listen for manual trigger events (for same-window updates)
    window.addEventListener('manualLessonUpdate', function(e) {
        console.log('Manual lesson update triggered');
        setTimeout(() => {
            forceRefreshAllLessons();
            injectAllLessons();
            forceUpdateAllModules();
        }, 100);
});
});

// Function to inject all lessons from admin data
function injectAllLessons() {
    console.log('Injecting all lessons from admin data...');
    
    // Check if lesson injection is disabled
    if (localStorage.getItem('disable_lesson_injection') === 'true') {
        console.log('Lesson injection is disabled');
        return;
    }
    
    // Get current admin courses
    const adminCourses = JSON.parse(localStorage.getItem('cybertech_admin_courses') || '[]');
    
    // Get current page URL to determine which course we're on
    const currentUrl = window.location.pathname;
    const currentPage = currentUrl.split('/').pop();
    
    // Determine which course to use based on the current page
    let targetCourse;
    console.log('Current page:', currentPage);
    console.log('Available admin courses:', adminCourses.map(c => c.name));
    
    if (currentPage.includes('phishing')) {
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('phishing awareness')
        );
        console.log('Looking for phishing course, found:', targetCourse?.name);
    } else if (currentPage.includes('password-security')) {
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('password security')
        );
        console.log('Looking for password course, found:', targetCourse?.name);
    } else if (currentPage.includes('data-protection')) {
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('data protection essentials')
        );
        console.log('Looking for data protection course, found:', targetCourse?.name);
    } else if (currentPage.includes('social-engineering')) {
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('social engineering defense')
        );
        console.log('Looking for social engineering course, found:', targetCourse?.name);
    } else {
        // Default to phishing course if we can't determine
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('phishing awareness')
        );
        console.log('Defaulting to phishing course, found:', targetCourse?.name);
    }
    
    if (!targetCourse) {
        console.error(`Could not find appropriate course in admin data for page: ${currentPage}`);
        return;
    }
    
    console.log('Found target course:', targetCourse.name);
    console.log('Course has modules:', targetCourse.modules.length);
    
    // Process each module in the course
    targetCourse.modules.forEach((module, moduleIndex) => {
        console.log(`Processing module ${moduleIndex + 1}: "${module.title}" with ${module.lessons ? module.lessons.length : 0} lessons`);
        
        if (module.lessons && module.lessons.length > 0) {
            // Find the module element in the page
            const moduleElement = findModuleElement(module.title, moduleIndex);
            
            if (moduleElement) {
                console.log(`Found DOM element for module: ${module.title}`);
                // Inject lessons for this module using consistent logic
                injectLessonsForModuleConsistent(module, moduleElement, moduleIndex);
            } else {
                console.log(`Module element not found for: ${module.title}, creating new module`);
                // If module doesn't exist in DOM, create it (for admin-created modules)
                createNewModule(module);
            }
        }
    });
    
    // Also update the course overview section
    updateCourseOverview(targetCourse);
    
    // Finally, force refresh all lessons to ensure everything is up to date
    forceRefreshAllLessons();
}

// Function to find a module element by title and index
function findModuleElement(moduleTitle, moduleIndex) {
    if (!moduleTitle) return null;
    
    // Method 1: Try to find by module header text
    const moduleHeaders = document.querySelectorAll('.module-header');
    for (const header of moduleHeaders) {
        if (header.textContent.toLowerCase().includes(moduleTitle.toLowerCase())) {
            return header.closest('.course-module');
        }
    }
    
    // Method 2: Try to find by module title element
    const moduleTitles = document.querySelectorAll('.module-title');
    for (const title of moduleTitles) {
        if (title.textContent.toLowerCase().includes(moduleTitle.toLowerCase())) {
            return title.closest('.course-module');
        }
    }
    
    // Method 3: Try to find by index (fallback)
    const allModules = document.querySelectorAll('.course-module');
    if (moduleIndex >= 0 && moduleIndex < allModules.length) {
        console.log(`Found module by index ${moduleIndex}`);
        return allModules[moduleIndex];
    }
    
    // Method 4: Try to find by partial title match
    for (const module of allModules) {
        const moduleText = module.textContent.toLowerCase();
        const searchText = moduleTitle.toLowerCase();
        
        // Try different matching strategies
        if (moduleText.includes(searchText) || 
            searchText.includes('identifying') && moduleText.includes('identifying') ||
            searchText.includes('psychology') && moduleText.includes('psychology') ||
            searchText.includes('introduction') && moduleText.includes('introduction')) {
            return module;
        }
    }
    
    return null;
}

// CONSISTENT lesson injection function for ALL modules
function injectLessonsForModuleConsistent(module, moduleElement, moduleIndex) {
    if (!module || !moduleElement) return;
    
    console.log(`🔄 Consistently injecting lessons for module: ${module.title} (index: ${moduleIndex})`);
    
    // Find the lessons list
    let lessonsList = moduleElement.querySelector('.module-lessons');
    if (!lessonsList) {
        // If no lessons list found, create one
        lessonsList = document.createElement('ul');
        lessonsList.className = 'module-lessons';
        
        const moduleContent = moduleElement.querySelector('.module-content');
        if (moduleContent) {
            moduleContent.appendChild(lessonsList);
        } else {
            moduleElement.appendChild(lessonsList);
        }
    } else {
        // For ALL modules, completely rebuild the lessons list to ensure consistency
        console.log(`Rebuilding lessons for ${module.title} to ensure all admin changes are applied`);
        
        // Store the original lessons list
        const originalLessonsList = lessonsList;
        
        // Create a new lessons list
        const newLessonsList = document.createElement('ul');
        newLessonsList.className = 'module-lessons';
        
        // Replace the old list with the new one
        originalLessonsList.parentNode.replaceChild(newLessonsList, originalLessonsList);
        
        // Update the reference
        lessonsList = newLessonsList;
    }
    
    // Process each lesson with CONSISTENT logic for ALL modules
    console.log(`Processing ${module.lessons.length} lessons for module "${module.title}"`);
    
    module.lessons.forEach((lesson, lessonIndex) => {
        console.log(`Creating lesson ${lessonIndex + 1}: "${lesson.title}" in module "${module.title}"`);
        
        const lessonId = `lesson-${lesson.id || lesson.title.toLowerCase().replace(/\s+/g, '-')}`;

        // Create lesson element using consistent logic
        createLessonElementConsistent(lessonsList, lesson, lessonId, module, moduleIndex);
    });
    
    console.log(`✅ Successfully processed ${module.lessons.length} lessons for module "${module.title}"`);
}

// CONSISTENT lesson element creation for ALL modules
function createLessonElementConsistent(lessonsList, lesson, lessonId, module, moduleIndex) {
    console.log(`Creating lesson element: ${lesson.title}`);
    
    // Create lesson list item
    const lessonLi = document.createElement('li');
    
    // Determine lesson type
    const isVideoLesson = lesson.type === 'video' || 
                         lesson.title.toLowerCase().includes('video') || 
                         lesson.title.toLowerCase().includes('analysis') || 
                         lesson.title.toLowerCase().includes('psychology') ||
                         lesson.title.toLowerCase().includes('triggers') ||
                         lesson.title.toLowerCase().includes('red flags') ||
                         lesson.title.toLowerCase().includes('urls') ||
                         lesson.title.toLowerCase().includes('phishing') ||
                         lesson.title.toLowerCase().includes('what is') ||
                         lesson.title.toLowerCase().includes('history') ||
                         lesson.title.toLowerCase().includes('evolution');
    
    const isInteractiveExercise = lesson.title.toLowerCase().includes('interactive') || 
                                 lesson.title.toLowerCase().includes('exercise') ||
                                 lesson.title.toLowerCase().includes('spot the phish');
    
    const isDocument = lesson.title.toLowerCase().includes('case studies') || 
                      lesson.title.toLowerCase().includes('document') ||
                      lesson.title.toLowerCase().includes('common types') ||
                      lesson.title === 'Common Types of Phishing Attacks';
    
    // Create lesson info div with proper styling
    const lessonInfo = document.createElement('div');
    lessonInfo.className = 'lesson-info video-lesson'; // **FIX: Always add video-lesson class for consistent styling**
    lessonInfo.id = lessonId;
    lessonInfo.style.cursor = 'pointer';
    
    // Add data attributes to track the lesson
    lessonInfo.setAttribute('data-lesson-id', lesson.id || '');
    lessonInfo.setAttribute('data-lesson-title', lesson.title);
    lessonInfo.setAttribute('data-module-index', moduleIndex);
    
    // Create icon with consistent styling
    const icon = document.createElement('i');
    if (isVideoLesson) {
        icon.className = 'fas fa-play-circle';
    } else if (isInteractiveExercise) {
        icon.className = 'fas fa-puzzle-piece';
    } else if (isDocument) {
        icon.className = 'fas fa-file-alt';
    } else {
        icon.className = 'fas fa-play-circle'; // **FIX: Default to play icon for consistency**
    }
    
    // Create title span with consistent styling
    const titleSpan = document.createElement('span');
    titleSpan.textContent = lesson.title;
    
    // Add admin class for styling if needed, but don't show the label
    if (lesson.isAdminVideo || lesson.addedByAdmin) {
        lessonInfo.classList.add('admin-video');
    }
    
    // Append icon and title to lesson info (matching original structure)
    lessonInfo.appendChild(icon);
    lessonInfo.appendChild(titleSpan);
    
    // Create duration span with consistent styling
    const durationSpan = document.createElement('span');
    durationSpan.className = 'lesson-length';
    durationSpan.id = lessonId.replace('lesson', 'duration');
    
    // **FIX: Handle duration properly to avoid "min min" duplication**
    let durationText = lesson.duration || '10';
    if (durationText.includes('min')) {
        // If duration already contains "min", use it as is
        durationSpan.textContent = durationText;
    } else {
        // If duration doesn't contain "min", add it
        durationSpan.textContent = `${durationText} min`;
    }
    
    // Append lesson info and duration to list item (matching original structure exactly)
    lessonLi.appendChild(lessonInfo);
    lessonLi.appendChild(durationSpan);
    
    // Add click handler based on lesson type
    if (isVideoLesson) {
        lessonInfo.addEventListener('click', function() {
            console.log(`Playing video for: ${lesson.title}`);
            
            // Get current course name based on page URL
            const currentUrl = window.location.pathname;
            const currentPage = currentUrl.split('/').pop();
            let courseName = 'Phishing Awareness'; // default
            
            if (currentPage.includes('password-security')) {
                courseName = 'Password Security';
            } else if (currentPage.includes('data-protection')) {
                courseName = 'Data Protection Essentials';
            } else if (currentPage.includes('social-engineering')) {
                courseName = 'Social Engineering Defense';
            }
            
            // Check if there's an admin video for this lesson
            const userVideos = JSON.parse(localStorage.getItem('cybertech_user_videos') || '[]');
            const adminVideo = userVideos.find(v => 
                v.isUploadedFile === true && 
                v.courseName === courseName &&
                v.moduleName === module.title &&
                v.lessonName === lesson.title
            );
            
            if (adminVideo && adminVideo.videoUrl) {
                openVideoModal(adminVideo.title, adminVideo.id, adminVideo.duration);
            } else {
                // Fallback to default video modal with lesson info
                openVideoModal(lesson.title, lessonId + '_video', parseInt(lesson.duration) || 10);
            }
        });
    } else if (isInteractiveExercise) {
        lessonInfo.addEventListener('click', function() {
            console.log(`Opening interactive exercise: ${lesson.title}`);
            // Add your interactive exercise logic here
            if (typeof openSpotThePhishExercise === 'function') {
                openSpotThePhishExercise();
            }
        });
    } else if (isDocument) {
        lessonInfo.addEventListener('click', function() {
            console.log(`Opening document/reading: ${lesson.title}`);
            // Add your document reading logic here
            if (typeof togglePhishingTypes === 'function') {
                togglePhishingTypes(lessonInfo);
            }
        });
    }
    
    // Add to lessons list
    lessonsList.appendChild(lessonLi);
    
    // **ENHANCED: Show green highlight only for new lessons or edited lessons**
    if (lesson.addedByAdmin || lesson.lastModified) {
        lessonLi.style.animation = 'highlightNew 3s ease-out';
        lessonLi.style.backgroundColor = '#f8fff8';
        lessonLi.style.borderLeft = '3px solid #28a745';
                
                // Remove the highlight after 5 seconds
                setTimeout(() => {
            lessonLi.style.backgroundColor = '';
            lessonLi.style.borderLeft = '';
                }, 5000);
        
        console.log(`🎯 Highlighting ${lesson.addedByAdmin ? 'new' : 'edited'} lesson: ${lesson.title}`);
    }
    
    console.log(`✅ Created lesson element: ${lesson.title}`);
}

// Function to force update ALL modules consistently
function forceUpdateAllModules() {
    console.log('🔄 Force updating ALL modules consistently...');
    
    // Get current admin courses
    const adminCourses = JSON.parse(localStorage.getItem('cybertech_admin_courses') || '[]');
    
    // Get current page URL to determine which course we're on
    const currentUrl = window.location.pathname;
    const currentPage = currentUrl.split('/').pop();
    
    // Only proceed if we're on a course page
    if (!currentPage.includes('course-')) {
        console.log('Not on a course page, skipping update');
        return;
    }
    
    let targetCourse;
    if (currentPage.includes('phishing')) {
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('phishing')
        );
    } else if (currentPage.includes('password-security')) {
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('password')
        );
    } else if (currentPage.includes('data-protection')) {
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('data protection')
        );
    } else if (currentPage.includes('social-engineering')) {
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('social engineering')
        );
    }
    
    if (!targetCourse) {
        console.error('Could not find target course in admin data');
        return;
    }
    
    console.log('Found target course:', targetCourse.name);
    console.log('Course modules:', targetCourse.modules.length);
    
    // Update ALL modules with consistent logic
    targetCourse.modules.forEach((module, moduleIndex) => {
        console.log(`🔄 Updating module ${moduleIndex + 1}: "${module.title}" with ${module.lessons ? module.lessons.length : 0} lessons`);
        
        if (module.lessons && module.lessons.length > 0) {
            // Find the module element in the page
            const moduleElement = findModuleElement(module.title, moduleIndex);
            
            if (moduleElement) {
                console.log(`Found module element for "${module.title}"`);
                
                // Use consistent injection logic for ALL modules
                injectLessonsForModuleConsistent(module, moduleElement, moduleIndex);
            } else {
                console.error(`Could not find module element for "${module.title}"`);
            }
        } else {
            console.log(`Module "${module.title}" has no lessons to update`);
        }
    });
    
    console.log('✅ Finished updating all modules');
}

// Function to force refresh all lessons in the DOM
function forceRefreshAllLessons() {
    console.log('🔄 Force refreshing all lessons in the DOM');
    
    // Get current admin courses
                    const adminCourses = JSON.parse(localStorage.getItem('cybertech_admin_courses') || '[]');
    
    // Find the appropriate course
    const currentPage = window.location.pathname.split('/').pop();
    let targetCourse;
    
    if (currentPage.includes('phishing')) {
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('phishing')
        );
    } else if (currentPage.includes('password-security')) {
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('password')
        );
    } else if (currentPage.includes('data-protection')) {
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('data protection')
        );
    } else if (currentPage.includes('social-engineering')) {
        targetCourse = adminCourses.find(course => 
            course.name && course.name.toLowerCase().includes('social engineering')
        );
    }
    
    if (!targetCourse) {
        console.error('Could not find target course for refresh');
        return;
    }
    
    // Update all lesson displays in the main course view
    document.querySelectorAll('.lesson-info').forEach(lessonDiv => {
                            const spanElement = lessonDiv.querySelector('span');
        if (!spanElement) return;
        
        // Get the current title displayed
        const currentTitle = spanElement.textContent.replace('(Admin Video)', '').trim();
        const lessonId = lessonDiv.id;
        
        // Find matching lesson in course data
        let matchingLesson = null;
        let matchingModule = null;
        
        // Search through all modules and lessons
        targetCourse.modules.forEach(module => {
            if (module.lessons) {
                module.lessons.forEach(lesson => {
                    // Try to match by ID or title
                    if ((lesson.id && lessonId.includes(lesson.id)) ||
                        (lesson.title && currentTitle && 
                        (currentTitle.includes(lesson.title) || lesson.title.includes(currentTitle)))) {
                        matchingLesson = lesson;
                        matchingModule = module;
                    }
                });
            }
        });
        
        // If we found a matching lesson and the title is different, update it
        if (matchingLesson && currentTitle !== matchingLesson.title) {
            console.log(`🔄 Updating lesson from "${currentTitle}" to "${matchingLesson.title}"`);
            
            // Update the title
            const adminLabel = spanElement.querySelector('small');
            if (adminLabel) {
                spanElement.innerHTML = `${matchingLesson.title} <small style="color: #4CAF50;">(Admin Video)</small>`;
            } else {
                spanElement.textContent = matchingLesson.title;
            }
            
            // Update data attributes
            lessonDiv.setAttribute('data-lesson-title', matchingLesson.title);
            
            // Highlight the updated lesson
            const listItem = lessonDiv.closest('li');
            if (listItem) {
    listItem.style.animation = 'highlightNew 3s ease-out';
    listItem.style.backgroundColor = '#f8fff8';
    listItem.style.borderLeft = '3px solid #28a745';
    
    // Remove the highlight after 5 seconds
    setTimeout(() => {
        listItem.style.backgroundColor = '';
        listItem.style.borderLeft = '';
    }, 5000);
            }
        }
    });
    
    console.log('✅ Finished refreshing all lessons');
}

// Function to update the course overview section
function updateCourseOverview(course) {
    // Find the course overview text element
    const overviewText = document.getElementById('course-overview-text');
    
    // DO NOT update the overview text content - preserve the original HTML content
    console.log('Preserving original course overview text in HTML');
    
    // Find the course overview module list
    const overviewList = document.querySelector('.course-modules .modules-list');
    if (!overviewList) return;
    
    // Process each module
    course.modules.forEach(module => {
        // Find the module item in the overview
const moduleItem = Array.from(overviewList.querySelectorAll('.module-list-item')).find(item => 
    item.textContent.toLowerCase().includes(module.title.toLowerCase())
);
        
        if (moduleItem && module.lessons) {
            // Process each lesson
            module.lessons.forEach(lesson => {
                // Check if this lesson already exists in the overview
let existingLesson = Array.from(moduleItem.querySelectorAll('.lesson-list-item')).find(item => 
    item.textContent.includes(lesson.title)
);

// If not found by exact title, try to find by similar title
if (!existingLesson) {
    existingLesson = Array.from(moduleItem.querySelectorAll('.lesson-list-item')).find(item => {
        const itemText = item.textContent.replace('•', '').split('-')[0].trim();
        return lesson.title && itemText && 
               (itemText.includes(lesson.title) || lesson.title.includes(itemText));
    });
}
                
                if (!existingLesson) {
                    // Create a new lesson item
                    const lessonItem = document.createElement('div');
                    lessonItem.className = 'lesson-list-item';
                    lessonItem.style.paddingLeft = '20px';
                    lessonItem.style.fontSize = '0.9em';
                    lessonItem.textContent = `• ${lesson.title} - ${lesson.duration || '0 min'}`;
                    
                    // Add highlight
                    lessonItem.style.color = '#28a745';
                    lessonItem.style.fontWeight = 'bold';
                    lessonItem.style.backgroundColor = '#f8fff8';
                    lessonItem.style.borderLeft = '3px solid #28a745';
                    
                    // Remove the highlight after 5 seconds
                    setTimeout(() => {
                        lessonItem.style.backgroundColor = '';
                        lessonItem.style.borderLeft = '';
                    }, 5000);
                    
                    // Add to the module
                    moduleItem.appendChild(lessonItem);
                } else {
                    // Update existing lesson title if needed
                    const currentTitle = existingLesson.textContent.split('-')[0].replace('•', '').trim();
                    if (currentTitle !== lesson.title) {
                        // Update the title
                        existingLesson.textContent = `• ${lesson.title} - ${lesson.duration || '0 min'}`;
                        
                        // Highlight the updated lesson
                        existingLesson.style.animation = 'highlightNew 3s ease-out';
                        existingLesson.style.backgroundColor = '#f8fff8';
                        existingLesson.style.borderLeft = '3px solid #28a745';
                        
                        // Remove the highlight after 5 seconds
                        setTimeout(() => {
                            existingLesson.style.backgroundColor = '';
                            existingLesson.style.borderLeft = '';
                        }, 5000);
                    }
                }
            });
        }
    });
}

// Function to create a new module (for admin-created modules)
function createNewModule(module) {
    console.log(`Creating new module: ${module.title}`);
    
    // Find the curriculum section
    const curriculumSection = document.querySelector('.course-curriculum');
    if (!curriculumSection) {
        console.error('Could not find curriculum section');
        return;
    }
    
    // Create new module element
    const moduleElement = document.createElement('div');
    moduleElement.className = 'course-module';
    
    // Create module header
    const moduleHeader = document.createElement('div');
    moduleHeader.className = 'module-header';
    
    const moduleTitle = document.createElement('h3');
    moduleTitle.className = 'module-title';
    moduleTitle.textContent = module.title;
    
    const moduleLength = document.createElement('span');
    moduleLength.className = 'module-length';
    moduleLength.innerHTML = `<i class="fas fa-clock"></i> <span class="module-duration">${module.duration || '30'} minutes</span>`;
    
    moduleHeader.appendChild(moduleTitle);
    moduleHeader.appendChild(moduleLength);
    
    // Create module content
    const moduleContent = document.createElement('div');
    moduleContent.className = 'module-content';
    
    const lessonsList = document.createElement('ul');
    lessonsList.className = 'module-lessons';
    
    // Add lessons to the module using consistent logic
                module.lessons.forEach(lesson => {
        const lessonId = `lesson-${lesson.id || lesson.title.toLowerCase().replace(/\s+/g, '-')}`;
        createLessonElementConsistent(lessonsList, lesson, lessonId, module, -1);
    });
    
    // Assemble the module
    moduleContent.appendChild(lessonsList);
    moduleElement.appendChild(moduleHeader);
    moduleElement.appendChild(moduleContent);
    
    // Add the new module to the curriculum section
    curriculumSection.appendChild(moduleElement);
    
    console.log(`Successfully created new module: ${module.title}`);
}

// Function to trigger manual updates (for same-window localStorage changes)
function triggerManualUpdate() {
    console.log('🔄 Triggering manual lesson update');
    window.dispatchEvent(new CustomEvent('manualLessonUpdate'));
}

// Function to add a lesson to user videos
function addLessonToUserVideos(lesson) {
    // Get current user videos
    const userVideos = JSON.parse(localStorage.getItem('cybertech_user_videos') || '[]');
    
    // Check if the video already exists by lesson name or ID
    const existingVideo = userVideos.find(video => 
        (video.lessonName && video.lessonName === lesson.title) ||
        (video.lessonId && video.lessonId === lesson.id)
    );
    
    // If it doesn't exist, add it
    if (!existingVideo) {
        console.log(`Adding ${lesson.title} video to user videos...`);
        
        const videoId = `${lesson.title.toLowerCase().replace(/\s+/g, '_')}_video_${Date.now()}`;
        
        // Find the module this lesson belongs to
                const adminCourses = JSON.parse(localStorage.getItem('cybertech_admin_courses') || '[]');
        const phishingCourse = adminCourses.find(course => 
                        course.name && course.name.toLowerCase().includes('phishing')
                    );
        
        let moduleName = '';
        if (phishingCourse) {
            phishingCourse.modules.forEach(module => {
                if (module.lessons && module.lessons.some(l => l.id === lesson.id || l.title === lesson.title)) {
                    moduleName = module.title;
                    }
                });
            }
        
        const newVideo = {
            id: videoId,
            title: lesson.title,
            duration: parseInt(lesson.duration) || 0,
            courseName: 'Phishing Awareness',
            moduleName: moduleName,
            lessonName: lesson.title,
            lessonId: lesson.id || '',
            isUploadedFile: true,
            timestamp: Date.now(),
            videoUrl: 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAACKBtZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0MiByMjQ3OSBkZDc5YTYxIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTEwIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAD2WIhAA3//728P4FNjuZQQAAAu5tb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAAZAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACGHRyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAZAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAgAAAAIAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAAGQAAAAAAAEAAAAAAZBtZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAACgAAAAEAFXEAAAAAAAtaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAE7bWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAAA+3N0YmwAAACXc3RzZAAAAAAAAAABAAAAh2F2YzEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAgACAEgAAABIAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//8AAAAxYXZjQwFkAAr/4QAYZ2QACqzZX4iIhAAAAwAEAAADAFA8SJZYAQAGaOvjyyLAAAAAGHN0dHMAAAAAAAAAAQAAAAEAAAQAAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAAQAAABRzdHN6AAAAAAAAAsUAAAABAAAAFHN0Y28AAAAAAAAAAQAAADAAAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjU2LjQwLjEwMQ=='
        };
        
        userVideos.push(newVideo);
        
        // Save the updated user videos
        localStorage.setItem('cybertech_user_videos', JSON.stringify(userVideos));
        
        // Also save the video data
        localStorage.setItem(`video_data_${videoId}`, newVideo.videoUrl);
        
        console.log(`${lesson.title} video added successfully to user videos!`);
    }
}

// Add global functions for manual testing and triggering
window.triggerManualUpdate = triggerManualUpdate;
window.forceUpdateAllModules = forceUpdateAllModules;
window.forceRefreshAllLessons = forceRefreshAllLessons;

// Function to set up click handlers for existing lessons
function setupExistingLessonHandlers() {
    console.log('🔧 Setting up click handlers for existing lessons...');
    
    // Get current course name based on page URL
    const currentUrl = window.location.pathname;
    const currentPage = currentUrl.split('/').pop();
    let courseName = 'Phishing Awareness'; // default
    
    if (currentPage.includes('password-security')) {
        courseName = 'Password Security';
    } else if (currentPage.includes('data-protection')) {
        courseName = 'Data Protection Essentials';
    } else if (currentPage.includes('social-engineering')) {
        courseName = 'Social Engineering Defense';
    }
    
    // Find all video lessons that don't have click handlers
    const videoLessons = document.querySelectorAll('.lesson-info.video-lesson');
    videoLessons.forEach(lessonDiv => {
        // Only add click handler if it doesn't already have one
        if (!lessonDiv.hasAttribute('data-click-handler-added')) {
            lessonDiv.setAttribute('data-click-handler-added', 'true');
            
            lessonDiv.addEventListener('click', function() {
                const lessonTitle = this.querySelector('span').textContent;
                console.log(`Playing video for existing lesson: ${lessonTitle}`);
                
                // Special handling for reading lessons
                if (lessonTitle === 'Common Attack Vectors and Examples' || 
                    lessonTitle === 'Common Data Breach Scenarios' ||
                    lessonTitle === 'Common Types of Phishing Attacks' ||
                    lessonTitle === 'Common Password Myths and Misconceptions') {
                    console.log('🚫 Blocking video for reading lesson:', lessonTitle);
                    // Convert to reading lesson
                    this.classList.remove('video-lesson');
                    this.classList.add('reading-lesson');
                    
                    // Update icon
                    const icon = this.querySelector('i:first-child');
                    if (icon) {
                        icon.className = 'fas fa-file-alt';
                        icon.style.color = '#e74c3c'; // Red color for reading lessons
                    }
                    
                    // Open appropriate modal
                    if (lessonTitle === 'Common Attack Vectors and Examples' && typeof openAttackVectorsModal === 'function') {
                        openAttackVectorsModal();
                    } else if (lessonTitle === 'Common Data Breach Scenarios' && typeof openDataBreachModal === 'function') {
                        openDataBreachModal();
                    } else if (lessonTitle === 'Common Types of Phishing Attacks' && typeof openPhishingTypesModal === 'function') {
                        openPhishingTypesModal();
                    } else if (lessonTitle === 'Common Password Myths and Misconceptions' && typeof openPasswordMythsModal === 'function') {
                        openPasswordMythsModal();
                    } else {
                        console.error(`Modal function not found for: ${lessonTitle}`);
                    }
                    return;
                }
                
                // Check if there's an admin video for this lesson
                const userVideos = JSON.parse(localStorage.getItem('cybertech_user_videos') || '[]');
                const adminVideo = userVideos.find(v => 
                    v.isUploadedFile === true && 
                    v.courseName === courseName &&
                    v.lessonName === lessonTitle
                );
                
                if (adminVideo && adminVideo.videoUrl) {
                    openVideoModal(adminVideo.title, adminVideo.id, adminVideo.duration);
                } else {
                    // Fallback to default video modal
                    const durationSpan = this.parentElement.querySelector('.lesson-length');
                    const duration = durationSpan ? parseInt(durationSpan.textContent) || 10 : 10;
                    openVideoModal(lessonTitle, lessonTitle.toLowerCase().replace(/\s+/g, '_') + '_video', duration);
                }
            });
            
            console.log(`✅ Added click handler for: ${lessonDiv.querySelector('span').textContent}`);
        }
    });
    
    // Handle interactive exercises
    const exerciseLessons = document.querySelectorAll('.lesson-info[id*="exercise"]');
    exerciseLessons.forEach(lessonDiv => {
        if (!lessonDiv.hasAttribute('data-click-handler-added')) {
            lessonDiv.setAttribute('data-click-handler-added', 'true');
            
            lessonDiv.addEventListener('click', function() {
                const lessonTitle = this.querySelector('span').textContent;
                console.log(`Opening interactive exercise: ${lessonTitle}`);
                
                // Check for course-specific exercise functions
                if (courseName === 'Password Security' && typeof openPasswordExercise === 'function') {
                    openPasswordExercise();
                } else if (courseName === 'Data Protection Essentials' && typeof openDataExercise === 'function') {
                    openDataExercise();
                } else if (courseName === 'Social Engineering Defense' && typeof openSocialExercise === 'function') {
                    openSocialExercise();
                } else if (courseName === 'Phishing Awareness' && typeof openSpotThePhishExercise === 'function') {
                    openSpotThePhishExercise();
                } else {
                    alert('Interactive exercise functionality is being loaded...');
                }
            });
            
            console.log(`✅ Added exercise handler for: ${lessonDiv.querySelector('span').textContent}`);
        }
    });
    
    // Handle expandable lessons (like password myths)
    const expandableLessons = document.querySelectorAll('.lesson-info.lesson-expandable');
    expandableLessons.forEach(lessonDiv => {
        if (!lessonDiv.hasAttribute('data-click-handler-added')) {
            lessonDiv.setAttribute('data-click-handler-added', 'true');
            
            lessonDiv.addEventListener('click', function() {
                const lessonTitle = this.querySelector('span').textContent;
                console.log(`Expanding lesson: ${lessonTitle}`);
                
                // Check for course-specific expand functions
                if (courseName === 'Password Security' && typeof togglePasswordMyths === 'function') {
                    togglePasswordMyths(this);
                } else {
                    // Default expand/collapse behavior
                    const expandedContent = this.parentElement.querySelector('.lesson-expanded-content');
                    if (expandedContent) {
                        const isExpanded = expandedContent.style.display !== 'none';
                        expandedContent.style.display = isExpanded ? 'none' : 'block';
                        
                        const expandIcon = this.querySelector('.expand-icon');
                        if (expandIcon) {
                            expandIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
                        }
                    }
                }
            });
            
            console.log(`✅ Added expandable handler for: ${lessonDiv.querySelector('span').textContent}`);
        }
    });
    
    // Handle reading lessons (like attack vectors)
    const readingLessons = document.querySelectorAll('.lesson-info.reading-lesson');
    readingLessons.forEach(lessonDiv => {
        if (!lessonDiv.hasAttribute('data-click-handler-added')) {
            lessonDiv.setAttribute('data-click-handler-added', 'true');
            
            lessonDiv.addEventListener('click', function() {
                const lessonTitle = this.querySelector('span').textContent;
                console.log(`Opening reading lesson: ${lessonTitle}`);
                
                // Special handling for reading lessons with modals
                if (lessonTitle === 'Common Attack Vectors and Examples') {
                    if (typeof openAttackVectorsModal === 'function') {
                        openAttackVectorsModal();
                    } else {
                        console.error('openAttackVectorsModal function not found');
                    }
                } else if (lessonTitle === 'Common Data Breach Scenarios') {
                    if (typeof openDataBreachModal === 'function') {
                        openDataBreachModal();
                    } else {
                        console.error('openDataBreachModal function not found');
                    }
                } else if (lessonTitle === 'Common Types of Phishing Attacks') {
                    if (typeof openPhishingTypesModal === 'function') {
                        openPhishingTypesModal();
                    } else {
                        console.error('openPhishingTypesModal function not found');
                    }
                } else {
                    // Default reading behavior
                    console.log(`Default reading behavior for: ${lessonTitle}`);
                }
            });
            
            console.log(`✅ Added reading handler for: ${lessonDiv.querySelector('span').textContent}`);
        }
    });
}

// Override localStorage.setItem to trigger manual updates for same-window changes
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    
    // Trigger manual update for course-related changes
    if (key === 'cybertech_admin_courses' || 
        key === 'cybertech_admin_courses_last_update' ||
        key === 'cybertech_course_changes') {
        
                        setTimeout(() => {
            triggerManualUpdate();
    }, 100);
    }
};

// Set up existing lesson handlers when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        setupExistingLessonHandlers();
    }, 1000);
});

// Function to convert video lessons to reading lessons for specific lessons
function convertVideoToReadingLessons() {
    const videoLessons = document.querySelectorAll('.lesson-info.video-lesson');
    videoLessons.forEach(lessonDiv => {
        const lessonTitle = lessonDiv.querySelector('span').textContent;
        
        // Convert specific lessons to reading lessons
        if (lessonTitle === 'Common Attack Vectors and Examples' || 
            lessonTitle === 'Common Data Breach Scenarios' ||
            lessonTitle === 'Common Types of Phishing Attacks') {
            console.log('🔄 Converting video lesson to reading lesson:', lessonTitle);
            
            // Remove video classes and add reading classes
            lessonDiv.classList.remove('video-lesson');
            lessonDiv.classList.add('reading-lesson');
            
            // Update icon
            const icon = lessonDiv.querySelector('i:first-child');
            if (icon) {
                icon.className = 'fas fa-file-alt';
                icon.style.color = '#e74c3c'; // Red color for reading lessons
            }
            
            // Remove any existing click handlers
            lessonDiv.removeAttribute('data-click-handler-added');
            
            console.log('✅ Converted video lesson to reading lesson:', lessonTitle);
        }
    });
}

// Call the conversion function periodically
setInterval(convertVideoToReadingLessons, 2000);

// Specific function to handle data breach lesson
function ensureDataBreachLesson() {
    const dataBreachLesson = document.querySelector('.lesson-info:has(span:contains("Common Data Breach Scenarios"))') || 
                             Array.from(document.querySelectorAll('.lesson-info')).find(el => 
                                 el.querySelector('span') && el.querySelector('span').textContent === 'Common Data Breach Scenarios'
                             );
    
    if (dataBreachLesson) {
        console.log('🎯 Found Common Data Breach Scenarios lesson, ensuring it\'s configured correctly');
        
        // Remove video classes and add reading classes
        dataBreachLesson.classList.remove('video-lesson', 'lesson-expandable');
        dataBreachLesson.classList.add('reading-lesson');
        
        // Update icon
        const icon = dataBreachLesson.querySelector('i:first-child');
        if (icon) {
            icon.className = 'fas fa-file-alt';
            icon.style.color = '#e74c3c';
        }
        
        // Remove any expandable content
        const expandedContent = dataBreachLesson.parentElement.querySelector('.lesson-expanded-content');
        if (expandedContent) {
            expandedContent.remove();
        }
        
        // Remove any expand icons
        const expandIcon = dataBreachLesson.querySelector('.expand-icon');
        if (expandIcon) {
            expandIcon.remove();
        }
        
        // Set click handler
        dataBreachLesson.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof openDataBreachModal === 'function') {
                openDataBreachModal();
            }
        };
        
        console.log('✅ Common Data Breach Scenarios lesson configured correctly');
    }
}

// Specific function to handle phishing types lesson
function ensurePhishingTypesLesson() {
    const phishingTypesLesson = document.querySelector('.lesson-info:has(span:contains("Common Types of Phishing Attacks"))') || 
                                Array.from(document.querySelectorAll('.lesson-info')).find(el => 
                                    el.querySelector('span') && el.querySelector('span').textContent === 'Common Types of Phishing Attacks'
                                );
    
    if (phishingTypesLesson) {
        console.log('🎯 Found Common Types of Phishing Attacks lesson, ensuring it\'s configured correctly');
        
        // Remove video classes and add reading classes
        phishingTypesLesson.classList.remove('video-lesson', 'lesson-expandable');
        phishingTypesLesson.classList.add('reading-lesson');
        
        // Update icon
        const icon = phishingTypesLesson.querySelector('i:first-child');
        if (icon) {
            icon.className = 'fas fa-file-alt';
            icon.style.color = '#e74c3c';
        }
        
        // Remove any expandable content
        const expandedContent = phishingTypesLesson.parentElement.querySelector('.lesson-expanded-content');
        if (expandedContent) {
            expandedContent.remove();
        }
        
        // Remove any expand icons
        const expandIcon = phishingTypesLesson.querySelector('.expand-icon');
        if (expandIcon) {
            expandIcon.remove();
        }
        
        // Set click handler
        phishingTypesLesson.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof openPhishingTypesModal === 'function') {
                openPhishingTypesModal();
            }
        };
        
        console.log('✅ Common Types of Phishing Attacks lesson configured correctly');
    }
}

// Specific function to handle password myths lesson
function ensurePasswordMythsLesson() {
    const passwordMythsLesson = document.querySelector('.lesson-info:has(span:contains("Common Password Myths and Misconceptions"))') || 
                               Array.from(document.querySelectorAll('.lesson-info')).find(el => 
                                   el.querySelector('span') && el.querySelector('span').textContent === 'Common Password Myths and Misconceptions'
                               );
    
    if (passwordMythsLesson) {
        console.log('🎯 Found Common Password Myths and Misconceptions lesson, ensuring it\'s configured correctly');
        
        // Remove video classes and add reading classes
        passwordMythsLesson.classList.remove('video-lesson', 'lesson-expandable');
        passwordMythsLesson.classList.add('reading-lesson');
        
        // Update icon
        const icon = passwordMythsLesson.querySelector('i:first-child');
        if (icon) {
            icon.className = 'fas fa-file-alt';
            icon.style.color = '#e74c3c';
        }
        
        // Remove any expandable content
        const expandedContent = passwordMythsLesson.parentElement.querySelector('.lesson-expanded-content');
        if (expandedContent) {
            expandedContent.remove();
        }
        
        // Remove any expand icons
        const expandIcon = passwordMythsLesson.querySelector('.expand-icon');
        if (expandIcon) {
            expandIcon.remove();
        }
        
        // Set click handler
        passwordMythsLesson.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof openPasswordMythsModal === 'function') {
                openPasswordMythsModal();
            }
        };
        
        console.log('✅ Common Password Myths and Misconceptions lesson configured correctly');
    }
}

// Call the lesson functions periodically
setInterval(ensurePhishingTypesLesson, 1000);
setInterval(ensureDataBreachLesson, 1000);
setInterval(ensurePasswordMythsLesson, 1000);

console.log('✅ Direct Lesson Injector loaded successfully with consistent module handling');