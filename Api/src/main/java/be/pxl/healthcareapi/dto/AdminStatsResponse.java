package be.pxl.healthcareapi.dto;

public record AdminStatsResponse(
        long totalAccounts,
        long lectoren,
        long cursisten
) {
}
