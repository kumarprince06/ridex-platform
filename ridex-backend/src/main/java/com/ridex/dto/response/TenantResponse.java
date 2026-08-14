package com.ridex.dto.response;

import java.time.LocalDateTime;

import com.ridex.tenant.TenantLifecycleStatus;

public class TenantResponse {
    private String id;
    private String businessName;
    private String businessEmail;
    private TenantLifecycleStatus lifecycleStatus;
    private LocalDateTime emailVerifiedAt;
    private LocalDateTime onboardingCompletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getBusinessName() {
        return businessName;
    }

    public void setBusinessName(String businessName) {
        this.businessName = businessName;
    }

    public String getBusinessEmail() {
        return businessEmail;
    }

    public void setBusinessEmail(String businessEmail) {
        this.businessEmail = businessEmail;
    }

    public TenantLifecycleStatus getLifecycleStatus() {
        return lifecycleStatus;
    }

    public void setLifecycleStatus(TenantLifecycleStatus lifecycleStatus) {
        this.lifecycleStatus = lifecycleStatus;
    }

    public LocalDateTime getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public void setEmailVerifiedAt(LocalDateTime emailVerifiedAt) {
        this.emailVerifiedAt = emailVerifiedAt;
    }

    public LocalDateTime getOnboardingCompletedAt() {
        return onboardingCompletedAt;
    }

    public void setOnboardingCompletedAt(LocalDateTime onboardingCompletedAt) {
        this.onboardingCompletedAt = onboardingCompletedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
}
