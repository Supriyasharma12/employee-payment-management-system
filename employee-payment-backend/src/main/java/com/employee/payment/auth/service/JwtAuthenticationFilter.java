package com.employee.payment.auth.service;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger =
            LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            UserDetailsService userDetailsService) {

        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader =
                request.getHeader("Authorization");

        // No Authorization header
        if (authHeader == null ||
                !authHeader.startsWith("Bearer ")) {

            filterChain.doFilter(request, response);
            return;
        }

        // Extract JWT token
        final String jwtToken =
                authHeader.substring(7);

        try {

            // Extract username from JWT
            String username =
                    jwtService.extractUsername(jwtToken);

            logger.info(
                    "JWT username extracted: {} for {} {}",
                    username,
                    request.getMethod(),
                    request.getRequestURI()
            );

            // Authenticate only if no authentication
            // already exists
            if (username != null &&
                    SecurityContextHolder
                            .getContext()
                            .getAuthentication() == null) {

                UserDetails userDetails =
                        userDetailsService
                                .loadUserByUsername(username);

                logger.info(
                        "User loaded successfully: {} with authorities: {}",
                        userDetails.getUsername(),
                        userDetails.getAuthorities()
                );

                // Validate token
                if (jwtService.isTokenValid(
                        jwtToken,
                        userDetails)) {

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    authentication.setDetails(
                            new WebAuthenticationDetailsSource()
                                    .buildDetails(request)
                    );

                    SecurityContextHolder
                            .getContext()
                            .setAuthentication(authentication);

                    logger.info(
                            "JWT authentication successful for user: {}",
                            username
                    );

                } else {

                    logger.warn(
                            "JWT validation returned false for user: {}",
                            username
                    );
                }
            }

        } catch (Exception ex) {

            /*
             * Do not expose the JWT itself in logs.
             * Log only the exception so the actual
             * authentication problem can be diagnosed.
             */
            logger.error(
                    "JWT authentication failed for {} {}. Reason: {}",
                    request.getMethod(),
                    request.getRequestURI(),
                    ex.getMessage(),
                    ex
            );

            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}